"""
Independent Backend Server Instance Application
Runs on port 8001 (Server A), 8002 (Server B), or 8003 (Server C).
Exposes /health, /api/process, /api/workload, and failure/delay simulation endpoints.
"""

import time
import asyncio
import os
from typing import Optional
from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel

SERVER_ID = os.getenv("SERVER_ID", "server_a")
SERVER_NAME = os.getenv("SERVER_NAME", "Server A (Primary Compute)")
SERVER_PORT = int(os.getenv("SERVER_PORT", "8001"))

app = FastAPI(title=f"LoadSphere Backend - {SERVER_NAME}")

# State
state = {
    "server_id": SERVER_ID,
    "server_name": SERVER_NAME,
    "port": SERVER_PORT,
    "is_healthy": True,
    "artificial_delay_ms": 0.0,
    "total_requests": 0,
    "active_requests": 0,
    "error_count": 0,
    "start_time": time.time()
}

class DelayRequest(BaseModel):
    delay_ms: float

@app.get("/health")
async def health_check():
    """Health check endpoint. Returns 500 when failure simulation is active."""
    if not state["is_healthy"]:
        raise HTTPException(status_code=500, detail=f"{SERVER_NAME} simulated hardware/process failure")
    
    uptime = time.time() - state["start_time"]
    return {
        "status": "UP",
        "server_id": state["server_id"],
        "server_name": state["server_name"],
        "port": state["port"],
        "uptime_seconds": round(uptime, 2),
        "active_requests": state["active_requests"],
        "total_requests": state["total_requests"],
        "cpu_usage": round(12.5 + (state["active_requests"] * 3.5), 1),
        "memory_usage": round(24.0 + (state["active_requests"] * 1.8), 1)
    }

@app.api_route("/api/process", methods=["GET", "POST"])
async def process_request():
    """General workload processing endpoint."""
    if not state["is_healthy"]:
        state["error_count"] += 1
        raise HTTPException(status_code=500, detail=f"{SERVER_NAME} is in a failed state")
        
    state["active_requests"] += 1
    state["total_requests"] += 1
    try:
        # Simulate latency if configured
        if state["artificial_delay_ms"] > 0:
            await asyncio.sleep(state["artificial_delay_ms"] / 1000.0)
        else:
            await asyncio.sleep(0.015) # 15ms base processing time
            
        return {
            "message": "Processed successfully",
            "server_id": state["server_id"],
            "server_name": state["server_name"],
            "port": state["port"],
            "timestamp": time.time()
        }
    finally:
        state["active_requests"] = max(0, state["active_requests"] - 1)

@app.get("/api/workload")
async def compute_workload():
    """CPU intensive or variable duration task for load testing."""
    if not state["is_healthy"]:
        raise HTTPException(status_code=500, detail="Server failure simulated")
        
    state["active_requests"] += 1
    state["total_requests"] += 1
    try:
        # CPU crunch simulation
        count = 0
        for i in range(150000):
            count += (i % 7)
        if state["artificial_delay_ms"] > 0:
            await asyncio.sleep(state["artificial_delay_ms"] / 1000.0)
        return {
            "status": "COMPUTED",
            "result_checksum": count,
            "server_id": state["server_id"],
            "server_name": state["server_name"],
            "port": state["port"]
        }
    finally:
        state["active_requests"] = max(0, state["active_requests"] - 1)

@app.post("/api/simulate/failure")
async def trigger_failure():
    """Forces server into failed state."""
    state["is_healthy"] = False
    return {"status": "FAILURE_SIMULATED", "server_id": state["server_id"], "is_healthy": False}

@app.post("/api/simulate/recover")
async def trigger_recovery():
    """Restores server to healthy operational status."""
    state["is_healthy"] = True
    state["artificial_delay_ms"] = 0.0
    return {"status": "RECOVERED", "server_id": state["server_id"], "is_healthy": True}

@app.post("/api/simulate/delay")
async def set_delay(req: DelayRequest):
    """Sets artificial latency."""
    state["artificial_delay_ms"] = req.delay_ms
    return {"status": "DELAY_CONFIGURED", "delay_ms": req.delay_ms}

@app.get("/api/stats")
async def get_stats():
    """Internal server statistics."""
    return state
