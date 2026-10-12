"""
LoadSphere Central Application Entry Point
"""

import sys
import os
from pathlib import Path

# Ensure loadsphere root is on sys.path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import uvicorn
from backend.app.main import app

def start():
    """Runs the central LoadSphere server."""
    port = int(os.getenv("LOADSPHERE_PORT", "8000"))
    host = os.getenv("LOADSPHERE_HOST", "0.0.0.0")
    print(f"Starting LoadSphere Enterprise Server on http://{host}:{port}")
    uvicorn.run("backend.app.main:app", host=host, port=port, reload=False)

if __name__ == "__main__":
    start()
