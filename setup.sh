#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "  Setting up VICE CLIPS Studio"
echo "  'Capture the chaos. Keep the moments.'"
echo "=========================================================="

# 1. Check FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "[ERROR] FFmpeg is not installed or not in PATH."
    echo "Please install FFmpeg via Homebrew: brew install ffmpeg"
    exit 1
fi
echo "[✓] FFmpeg detected: $(ffmpeg -version | head -n 1)"

# 2. Check Python
PYTHON_BIN=""
if command -v python3 &> /dev/null; then
    PYTHON_BIN="python3"
else
    echo "[ERROR] Python 3 is required."
    exit 1
fi
echo "[✓] Python detected: $($PYTHON_BIN --version)"

# 3. Setup Python Virtual Environment
if [ ! -d ".venv" ]; then
    echo "[*] Creating Python virtual environment in .venv..."
    $PYTHON_BIN -m venv .venv
fi

source .venv/bin/activate
echo "[*] Installing Python backend dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt
echo "[✓] Backend dependencies installed."

# 4. Check Node and setup Frontend
if ! command -v npm &> /dev/null; then
    echo "[ERROR] Node.js and npm are required for the frontend."
    exit 1
fi
echo "[✓] Node detected: $(node -v), npm: $(npm -v)"

echo "[*] Installing frontend npm packages..."
cd frontend
npm install --silent
echo "[*] Compiling frontend production build..."
npm run build
cd ..

# 5. Initialize data directories
mkdir -p data/recordings data/clips data/thumbnails

# 6. Ensure scripts are executable
chmod +x setup.sh watch.sh dashboard.sh 2>/dev/null || true

echo ""
echo "=========================================================="
echo "  VICE CLIPS Setup Complete!"
echo "  To launch the studio:    ./dashboard.sh"
echo "  To watch a live stream:  ./watch.sh <YOUTUBE_URL>"
echo "=========================================================="
