import dns.resolver

# DNS patch FIRST
# resolver = dns.resolver.Resolver(configure=False)
# resolver.nameservers = ['1.1.1.1', '8.8.8.8']
# dns.resolver.default_resolver = resolver

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
import uuid
import asyncio

from config import settings
from agent import invoke_agent, clear_memory, get_schema_str, _sessions

app = FastAPI(title=settings.APP_NAME, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://querymind-db-agent.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# ── Models ────────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    session_id: str


class ChatResponse(BaseModel):
    session_id: str
    intent: str
    message: str
    query: Optional[str] = None
    query_explanation: Optional[str] = None
    is_read_only: Optional[bool] = None
    rows: Optional[List[Dict[str, Any]]] = None
    columns: Optional[List[str]] = None
    row_count: Optional[int] = None
    error: Optional[str] = None
    suggest_visualization: Optional[str] = None
    visualization_config: Optional[Dict[str, Any]] = None


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {"status": "ok", "app": settings.APP_NAME, "provider": settings.LLM_PROVIDER,
            "model": settings.LLM_MODEL, "db_type": settings.DB_TYPE}


@app.get("/health")
async def health():
    db_ok = False
    db_error = None
    try:
        schema = get_schema_str()
        db_ok = "unavailable" not in schema
    except Exception as e:
        db_error = str(e)
    return {"status": "ok", "db_connected": db_ok, "db_error": db_error}


@app.get("/schema")
async def schema():
    return {"schema": get_schema_str()}


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(400, "Message cannot be empty")
    result = await invoke_agent(req.message, req.session_id)
    return ChatResponse(
        session_id=req.session_id,
        intent=result.intent,
        message=result.message,
        query=result.query,
        query_explanation=result.query_explanation,
        is_read_only=result.is_read_only,
        rows=result.rows,
        columns=result.columns,
        row_count=result.row_count,
        error=result.error,
        suggest_visualization=result.suggest_visualization,
        visualization_config=result.visualization_config,
    )


@app.delete("/session/{session_id}")
async def clear_session(session_id: str):
    clear_memory(session_id)
    return {"cleared": True, "session_id": session_id}


@app.get("/sessions")
async def list_sessions():
    return {"active_sessions": list(_sessions.keys())}


# ── WebSocket for streaming ───────────────────────────────────────────────────
@app.websocket("/ws/{session_id}")
async def websocket_chat(websocket: WebSocket, session_id: str):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            message = payload.get("message", "")
            if not message:
                continue
            await websocket.send_json({"type": "thinking", "content": "..."})
            result = await invoke_agent(message, session_id)
            await websocket.send_json({
                "type": "response",
                "intent": result.intent,
                "message": result.message,
                "query": result.query,
                "query_explanation": result.query_explanation,
                "is_read_only": result.is_read_only,
                "rows": result.rows,
                "columns": result.columns,
                "row_count": result.row_count,
                "error": result.error,
                "suggest_visualization": result.suggest_visualization,
                "visualization_config": result.visualization_config,
            })
    except WebSocketDisconnect:
        pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=settings.DEBUG)
