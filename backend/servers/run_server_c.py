"""Launcher for Server C (Port 8003)"""
import os
import sys
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import uvicorn

if __name__ == "__main__":
    os.environ["SERVER_ID"] = "server_c"
    os.environ["SERVER_NAME"] = "Server C (Burst Compute)"
    os.environ["SERVER_PORT"] = "8003"
    uvicorn.run("backend.servers.server_instance:app", host="0.0.0.0", port=8003, log_level="warning")
