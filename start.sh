#!/bin/bash
# ── DB AI Agent Start Script ──────────────────────────────────────

set -e

echo "⚡ DB AI Agent - Starting up..."
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
  echo "❌ Python3 is required. Please install it."
  exit 1
fi

# Check Node
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is required. Please install it."
  exit 1
fi

# Backend setup
echo "🐍 Setting up backend..."
cd backend

if [ ! -f ".env" ]; then
  echo "⚠️  No .env found. Copying .env.example → .env"
  cp .env.example .env
  echo "⚠️  Please edit backend/.env with your config before re-running."
  exit 1
fi

pip install -r requirements.txt -q
echo "✅ Backend dependencies installed"

# Start backend in background
python main.py &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID) → http://localhost:8000"

cd ..

# Frontend setup
echo ""
echo "⚛️  Setting up frontend..."
cd frontend

npm install --silent
echo "✅ Frontend dependencies installed"

echo ""
echo "🚀 Starting frontend → http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop everything."
echo ""

# Kill backend on exit
trap "echo 'Stopping...'; kill $BACKEND_PID 2>/dev/null; exit" INT TERM

npm start
