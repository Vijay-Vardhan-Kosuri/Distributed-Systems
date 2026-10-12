"""
Unit Tests for Independent Backend Server Endpoints using asyncio.run
"""

import asyncio
from httpx import AsyncClient, ASGITransport
from backend.servers.server_instance import app

def test_server_health_up():
    async def _run():
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.get("/health")
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "UP"
            assert "server_id" in data
    asyncio.run(_run())

def test_server_process():
    async def _run():
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.get("/api/process")
            assert resp.status_code == 200
            assert resp.json()["message"] == "Processed successfully"
    asyncio.run(_run())

def test_server_simulated_failure_and_recovery():
    async def _run():
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            # Trigger failure
            fail_resp = await ac.post("/api/simulate/failure")
            assert fail_resp.status_code == 200
            
            # Health should now fail (500)
            h_resp = await ac.get("/health")
            assert h_resp.status_code == 500
            
            # Recover
            rec_resp = await ac.post("/api/simulate/recover")
            assert rec_resp.status_code == 200
            
            # Health should be 200 UP again
            h_resp2 = await ac.get("/health")
            assert h_resp2.status_code == 200
    asyncio.run(_run())
