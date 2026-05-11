# ⚡ DB AI Agent

live:  https://querymind-db-agent.vercel.app

A full-stack AI-powered database agent that lets you query **any SQL or MongoDB database** using natural language. Built with React, Python FastAPI, and LangChain.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🗣️ Natural Language Queries | Ask questions in plain English — agent generates the right SQL or MongoDB query |
| 📊 Automatic Visualization | Bar, Line, Area, Pie charts with toggle between chart and table view |
| 🧠 Conversation Memory | Retains context within a session (last 20 messages) |
| 🔒 Privacy Guard | Sensitive columns (passwords, tokens, SSNs) are always redacted |
| ✅ Read-Only Validation | All queries are validated as read-only before execution |
| 💬 Dual Mode | Knows when to query the DB vs just chat |
| 🌗 Light & Dark Mode | Full theme toggle |
| ⚙️ Flexible Config | Switch LLM or DB with only `.env` changes |

---

## 🛠️ Supported Configurations

### LLM Providers
- **Google Gemini** (`google`) — e.g., `gemini-2.5-flash`, `gemini-1.5-pro`
- **OpenAI** (`openai`) — e.g., `gpt-4o`, `gpt-4-turbo`
- **Anthropic** (`anthropic`) — e.g., `claude-opus-4-5`, `claude-sonnet-4-5`

### Databases
- **PostgreSQL** — `postgresql://user:pass@host:5432/db`
- **MySQL** — `mysql+pymysql://user:pass@host:3306/db`
- **SQLite** — `sqlite:///./mydb.sqlite`
- **MongoDB** — separate `MONGO_URI` + `MONGO_DB_NAME`

---

## 🚀 Quick Start

### 1. Clone & Set Up Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your config
pip install -r requirements.txt
python main.py
# Backend runs at http://localhost:8000
```

### 2. Set Up Frontend

```bash
cd frontend
npm install
npm start
# Frontend runs at http://localhost:3000
```

---

## ⚙️ Configuration (.env)

```env
# LLM — choose your provider
LLM_PROVIDER=google           # google | openai | anthropic
LLM_MODEL=gemini-2.5-flash    # any model name from the provider
LLM_API_KEY=your-key-here

# Database
DB_TYPE=postgresql            # postgresql | mysql | sqlite | mongodb
DB_URI=postgresql://user:pass@localhost:5432/mydb

# MongoDB (if DB_TYPE=mongodb)
# MONGO_URI=mongodb://localhost:27017
# MONGO_DB_NAME=mydb

# Privacy
MAX_ROWS=100                  # max rows per query
SENSITIVE_COLUMNS=password,ssn,credit_card,token,api_key
```

---

## 📡 API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/` | App info & status |
| GET | `/health` | DB connection health check |
| GET | `/schema` | Database schema |
| POST | `/chat` | Send a message, get AI response |
| DELETE | `/session/{id}` | Clear session memory |
| WS | `/ws/{session_id}` | WebSocket for real-time streaming |

### Chat Request/Response

```json
// POST /chat
{ "message": "Show top 10 users by revenue", "session_id": "uuid" }

// Response
{
  "intent": "db_query",
  "message": "Here are the top 10 users by total revenue...",
  "query": "SELECT user_id, SUM(amount) as revenue FROM orders GROUP BY user_id ORDER BY revenue DESC LIMIT 10",
  "query_explanation": "Aggregates total revenue per user and returns top 10",
  "is_read_only": true,
  "rows": [...],
  "columns": ["user_id", "revenue"],
  "row_count": 10,
  "suggest_visualization": "bar_chart",
  "visualization_config": { "title": "Top Users by Revenue", "x_key": "user_id", "y_key": "revenue" }
}
```

---

## 🏗️ Architecture

```
db-ai-agent/
├── backend/
│   ├── main.py          # FastAPI app, routes, WebSocket
│   ├── agent.py         # Core LangChain agent + memory + intent detection
│   ├── db_connector.py  # SQL (SQLAlchemy) + MongoDB connectors
│   ├── llm_factory.py   # LLM provider factory (Google/OpenAI/Anthropic)
│   ├── config.py        # Pydantic settings from .env
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.js             # Main layout, session, theme
    │   ├── components/
    │   │   ├── Message.js     # Message renderer (text, query, table, charts)
    │   │   ├── DataTable.js   # Sortable, filterable data table
    │   │   └── Charts.js      # Recharts visualizations
    │   └── utils/api.js       # API client
    └── package.json
```

---

## 🔐 Safety

- **Write operations are blocked** — the agent validates every query as read-only before execution
- **Sensitive columns are always redacted** — configure in `SENSITIVE_COLUMNS`
- **Row limits** — configurable `MAX_ROWS` prevents massive data dumps
- **No fabrication** — agent is instructed never to return example data as real data

---

## 💡 Example Queries

```
"How many users signed up last month?"
"Show me the top 10 products by sales volume with a chart"
"What's the average order value per country?"
"Compare revenue across different categories"
"Show the schema of the database"
"Which customers haven't ordered in 90 days?"
```

---

## 🐛 Troubleshooting

**Backend won't start:** Check your `.env` file — make sure `LLM_API_KEY` and `DB_URI` are set.

**DB not connecting:** For PostgreSQL/MySQL, make sure the server is running and credentials are correct. For SQLite, the file will be created automatically.

**LLM errors:** Verify your `LLM_API_KEY` is valid and the `LLM_MODEL` name matches the provider's model list.

**CORS issues:** The backend allows all origins by default. For production, restrict `allow_origins` in `main.py`.
