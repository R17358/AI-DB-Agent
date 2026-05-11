import json
import re
import asyncio
from typing import Any, AsyncGenerator, Callable, Dict, List, Optional, Tuple
from langchain.memory import ConversationBufferWindowMemory
from langchain.schema import HumanMessage, AIMessage, SystemMessage
from config import settings
from db_connector import get_connector
from llm_factory import get_llm


# ── Human-readable error parser ──────────────────────────────────────────────
def parse_llm_error(e: Exception) -> str:
    msg = str(e)
    msg_lower = msg.lower()

    if any(x in msg_lower for x in ["quota", "exhausted", "resource_exhausted", "429", "rate limit", "too many requests"]):
        return "⚠️ API quota exhausted or rate limit hit. Please wait a moment and try again, or check your API plan limits."
    if any(x in msg_lower for x in ["invalid api key", "api_key", "authentication", "401", "unauthorized", "unauthenticated"]):
        return "🔑 Invalid or missing API key. Please check LLM_API_KEY in your .env file."
    if any(x in msg_lower for x in ["model not found", "does not exist", "invalid model", "404"]):
        return f"🤖 Model not found: '{settings.LLM_MODEL}'. Check LLM_MODEL in your .env file."
    if any(x in msg_lower for x in ["connection", "timeout", "network", "refused", "unreachable"]):
        return "🌐 Network error reaching the AI provider. Check your internet connection."
    if any(x in msg_lower for x in ["billing", "payment", "insufficient"]):
        return "💳 API billing issue. Please check your account balance with the AI provider."
    if any(x in msg_lower for x in ["context length", "token", "maximum context"]):
        return "📏 Message too long for the model's context window. Try starting a new chat."
    return f"LLM Error: {msg}"


# ── Singleton memory per session ────────────────────────────────────────────
_sessions: Dict[str, ConversationBufferWindowMemory] = {}

def get_memory(session_id: str) -> ConversationBufferWindowMemory:
    if session_id not in _sessions:
        _sessions[session_id] = ConversationBufferWindowMemory(
            k=20, return_messages=True, memory_key="history"
        )
    return _sessions[session_id]

def clear_memory(session_id: str):
    if session_id in _sessions:
        del _sessions[session_id]


# ── Schema loader ────────────────────────────────────────────────────────────
_schema_cache: Optional[str] = None

def get_schema_str(force_refresh: bool = False) -> str:
    global _schema_cache
    if _schema_cache and not force_refresh:
        return _schema_cache
    try:
        connector = get_connector()
        schema = connector.get_schema()
        if settings.is_mongo:
            lines = ["MongoDB Collections & Fields:"]
            for coll, fields in schema.items():
                lines.append(f"  {coll}: {', '.join(fields)}")
        else:
            lines = ["SQL Tables & Columns:"]
            for table, cols in schema.items():
                col_strs = [f"{c['name']} ({c['type']})" for c in cols]
                lines.append(f"  {table}: {', '.join(col_strs)}")
        _schema_cache = "\n".join(lines)
    except Exception as e:
        _schema_cache = f"[Schema unavailable: {e}]"
    return _schema_cache


# ── Intent classifier ────────────────────────────────────────────────────────
DB_KEYWORDS = [
    "select", "from", "where", "table", "column", "row", "record", "database",
    "query", "count", "show me", "list", "how many", "total", "average", "max",
    "min", "group by", "order by", "join", "aggregate", "find", "search",
    "fetch", "retrieve", "insert", "update", "delete", "schema", "collection",
    "mongo", "sql", "data from", "records", "entries", "top ", "latest",
    "recent", "oldest", "sum", "revenue", "sales", "users", "orders", "products",
]

def is_db_query(message: str) -> bool:
    msg_lower = message.lower()
    return any(kw in msg_lower for kw in DB_KEYWORDS)


# ── System prompts ────────────────────────────────────────────────────────────
def build_system_prompt(schema_str: str) -> str:
    db_type = "MongoDB" if settings.is_mongo else settings.DB_TYPE.upper()
    query_format = (
        "JSON object: {collection, operation (find/aggregate/count), filter, projection, limit, pipeline}"
        if settings.is_mongo else
        "raw SQL string"
    )

    return f"""You are an expert DB AI Agent connected to a {db_type} database.

DATABASE SCHEMA:
{schema_str}

YOUR CAPABILITIES:
1. Normal conversation & explanations — respond naturally when no DB query is needed.
2. Database queries — generate and execute {db_type} queries when the user asks about data.
3. Data analysis — interpret results, spot trends, suggest visualizations.
4. Privacy guard — never expose sensitive data columns like passwords, tokens, SSNs.

QUERY GENERATION RULES:
- When the user's question requires database data, respond with a JSON block in this EXACT format:
  ```db_query
  {{
    "intent": "db_query",
    "query": <{query_format}>,
    "explanation": "Plain English explanation of what the query does",
    "is_read_only": true,
    "suggest_visualization": null or "bar_chart" | "line_chart" | "pie_chart" | "scatter" | "table" | "metric_cards",
    "visualization_config": {{
      "title": "Chart title",
      "x_key": "column for X axis",
      "y_key": "column for Y axis",
      "category_key": "column for grouping (optional)"
    }}
  }}
  ```
- Only generate queries that are READ-ONLY. If the user asks to modify data, explain that write operations are disabled for safety.
- Always set is_read_only to true/false accurately.
- Limit results to {settings.MAX_ROWS} rows max.
- If you don't know something, say so. NEVER fabricate data or results.
- If you provide examples (not real data), clearly label them as "Example (not real data):".
- suggest_visualization should be null for simple facts, use appropriate chart type for comparative/trend data.

CONVERSATION STYLE:
- Be concise but complete.
- When showing query results, explain them in plain language.
- For comparisons and trends, proactively suggest what visualizations would help.
- If asked something outside your knowledge, say so honestly.
- Do NOT hallucinate database schema or data that isn't in the schema above.
"""


# ── Main agent invoke ────────────────────────────────────────────────────────
class AgentResponse:
    def __init__(self):
        self.message: str = ""
        self.query: Optional[str] = None
        self.query_explanation: Optional[str] = None
        self.is_read_only: Optional[bool] = None
        self.rows: Optional[List[Dict]] = None
        self.columns: Optional[List[str]] = None
        self.row_count: Optional[int] = None
        self.error: Optional[str] = None
        self.suggest_visualization: Optional[str] = None
        self.visualization_config: Optional[Dict] = None
        self.intent: str = "chat"


async def invoke_agent(
    user_message: str,
    session_id: str,
    status_cb: Optional[Callable[[str, str], None]] = None,
) -> AgentResponse:
    """
    status_cb(stage, message) is called at each processing step so the
    frontend can show live progress.  Stages: thinking | querying | running |
    summarizing | done | error
    """
    async def emit(stage: str, msg: str):
        if status_cb:
            await status_cb(stage, msg)

    response = AgentResponse()
    llm = get_llm()
    memory = get_memory(session_id)
    schema_str = get_schema_str()

    system_prompt = build_system_prompt(schema_str)
    history: List = memory.chat_memory.messages
    messages = [SystemMessage(content=system_prompt)] + history + [HumanMessage(content=user_message)]

    # ── Step 1: ask the LLM ─────────────────────────────────────────────────
    await emit("thinking", "Thinking…")
    try:
        ai_response = await llm.ainvoke(messages)
        raw_text = ai_response.content
    except Exception as e:
        err_msg = parse_llm_error(e)
        await emit("error", err_msg)
        response.error = err_msg
        response.message = err_msg
        return response

    # Save to memory
    memory.chat_memory.add_user_message(user_message)
    memory.chat_memory.add_ai_message(raw_text)

    # ── Step 2: detect db_query block ────────────────────────────────────────
    db_block_match = re.search(r"```db_query\s*([\s\S]*?)```", raw_text, re.DOTALL)

    if db_block_match:
        response.intent = "db_query"
        json_str = db_block_match.group(1).strip()

        await emit("querying", "Generating query…")
        try:
            print(json_str)
            parsed = json.loads(json_str)
        except json.JSONDecodeError as e:
            response.message = raw_text.replace(db_block_match.group(0), "").strip()
            response.error = f"Failed to parse query JSON: {e}"
            await emit("error", response.error)
            return response

        query = parsed.get("query")
        response.query = json.dumps(query, indent=2) if isinstance(query, dict) else str(query)
        response.query_explanation = parsed.get("explanation", "")
        response.is_read_only = parsed.get("is_read_only", True)
        response.suggest_visualization = parsed.get("suggest_visualization")
        response.visualization_config = parsed.get("visualization_config")

        convo_text = raw_text.replace(db_block_match.group(0), "").strip()
        response.message = convo_text if convo_text else response.query_explanation

        if not response.is_read_only:
            msg = "⚠️ Write operations are disabled for safety. Only SELECT / read queries are allowed."
            response.error = msg
            await emit("error", msg)
            response.rows = None
            return response

        # ── Step 3: execute ──────────────────────────────────────────────────
        await emit("running", "Executing query on database…")
        try:
            connector = get_connector()
            rows, columns, executed_query = connector.execute(query)
            response.rows = rows
            response.columns = columns
            response.row_count = len(rows)
            response.query = executed_query
        except Exception as e:
            err_msg = f"Database error: {e}"
            response.error = err_msg
            response.message = f"Query was generated but failed to run: {e}"
            await emit("error", err_msg)
            return response

        # ── Step 4: summarize ────────────────────────────────────────────────
        if rows:
            await emit("summarizing", f"Analysing {len(rows)} rows…")
            try:
                sample = rows[:5]
                summary_prompt = (
                    f'The user asked: "{user_message}"\n'
                    f"The query returned {len(rows)} rows. Sample: {json.dumps(sample, default=str)}\n"
                    "Give a concise, insightful 2-3 sentence summary in plain English. Do not repeat raw data."
                )
                summary_msgs = [
                    SystemMessage(content="You are a data analyst. Be concise and insightful."),
                    HumanMessage(content=summary_prompt),
                ]
                summary_resp = await llm.ainvoke(summary_msgs)
                response.message = summary_resp.content
            except Exception as e:
                # Summarisation failure is non-fatal — show results without summary
                response.message = f"Query returned {len(rows)} rows."
                response.error = f"Summary generation failed: {parse_llm_error(e)}"
        else:
            response.message = "The query returned no results."

    else:
        response.intent = "chat"
        response.message = raw_text

    await emit("done", "Done")
    return response
