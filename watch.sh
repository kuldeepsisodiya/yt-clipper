#!/usr/bin/env bash
set -e

if [ $# -lt 1 ]; then
    echo "Usage: ./watch.sh <YOUTUBE_URL_OR_DEMO>"
    echo "Examples:"
    echo "  ./watch.sh https://www.youtube.com/watch?v=VIDEO_ID"
    echo "  ./watch.sh demo"
    exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [ ! -d ".venv" ]; then
    echo "[!] Virtual environment not found. Running ./setup.sh first..."
    ./setup.sh
fi

source .venv/bin/activate
export PYTHONPATH="$ROOT_DIR"

python -m backend.watch "$@"
