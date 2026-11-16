#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [ ! -d ".venv" ]; then
    echo "[!] Virtual environment not found. Running ./setup.sh first..."
    ./setup.sh
fi

source .venv/bin/activate
export PYTHONPATH="$ROOT_DIR"

echo "=========================================================="
echo "  VICE CLIPS — GTA VI Highlight & Clipping Studio"
echo "  'Capture the chaos. Keep the moments.'"
echo "=========================================================="
echo ""
echo "  Studio Dashboard:   http://localhost:5173"
echo "  Backend API:        http://127.0.0.1:8000"
echo "  API Documentation:  http://127.0.0.1:8000/docs"
echo ""
echo "  Press Ctrl+C to stop both servers."
echo "=========================================================="
echo ""

# Launch Backend in background
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

# Launch Frontend in background
cd "$ROOT_DIR/frontend"
npm run dev -- --host 127.0.0.1 --port 5173 &
FRONTEND_PID=$!

cleanup() {
    echo ""
    echo "[*] Shutting down VICE CLIPS studio..."
    kill "$BACKEND_PID" 2>/dev/null || true
    kill "$FRONTEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
    wait "$FRONTEND_PID" 2>/dev/null || true
    echo "[✓] Servers stopped cleanly."
    exit 0
}

trap cleanup INT TERM EXIT

# Wait on background processes
wait
