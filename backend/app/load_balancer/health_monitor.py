"""
Automated Health Monitoring and Failure Recovery Service
Periodically queries the health endpoints of backend servers.
Enforces failure threshold and recovery threshold state transitions.
"""

import asyncio
import logging
import httpx
from datetime import datetime
from typing import Dict, Any
from backend.app.config import settings
from backend.app.database import SessionLocal
from backend.app.models.base import BackendServer, HealthCheckLog, AuditLog

logger = logging.getLogger("loadsphere.health_monitor")

class HealthMonitor:
    def __init__(self):
        self.interval = settings.HEALTH_CHECK_INTERVAL
        self.timeout = settings.HEALTH_CHECK_TIMEOUT
        self.failure_threshold = settings.CONSECUTIVE_FAILURES_THRESHOLD
        self.recovery_threshold = settings.CONSECUTIVE_SUCCESSES_THRESHOLD
        self.is_running = False
        self._task: asyncio.Task = None
        
    def update_policy(self, interval: float, timeout: float, fail_thresh: int, rec_thresh: int):
        self.interval = interval
        self.timeout = timeout
        self.failure_threshold = fail_thresh
        self.recovery_threshold = rec_thresh
        
    async def check_server(self, client: httpx.AsyncClient, server_id: str, server_url: str) -> Dict[str, Any]:
        """Sends HTTP GET to backend /health endpoint with timeout."""
        health_url = f"{server_url.rstrip('/')}/health"
        start_time = asyncio.get_event_loop().time()
        
        try:
            resp = await client.get(health_url, timeout=self.timeout)
            duration_ms = (asyncio.get_event_loop().time() - start_time) * 1000.0
            
            if resp.status_code == 200:
                data = {}
                try:
                    data = resp.json()
                except Exception:
                    pass
                return {
                    "is_up": True,
                    "status_code": 200,
                    "latency_ms": round(duration_ms, 2),
                    "error": None,
                    "cpu": data.get("cpu_usage", 12.0),
                    "memory": data.get("memory_usage", 28.0)
                }
            else:
                return {
                    "is_up": False,
                    "status_code": resp.status_code,
                    "latency_ms": round(duration_ms, 2),
                    "error": f"HTTP {resp.status_code}: {resp.text[:100]}",
                    "cpu": 0.0,
                    "memory": 0.0
                }
        except httpx.TimeoutException:
            duration_ms = (asyncio.get_event_loop().time() - start_time) * 1000.0
            return {
                "is_up": False,
                "status_code": None,
                "latency_ms": round(duration_ms, 2),
                "error": "Connection timed out",
                "cpu": 0.0,
                "memory": 0.0
            }
        except Exception as exc:
            duration_ms = (asyncio.get_event_loop().time() - start_time) * 1000.0
            return {
                "is_up": False,
                "status_code": None,
                "latency_ms": round(duration_ms, 2),
                "error": str(exc),
                "cpu": 0.0,
                "memory": 0.0
            }

    async def run_check_cycle(self):
        """Performs a single health check pass across all configured servers."""
        db = SessionLocal()
        try:
            servers = db.query(BackendServer).all()
            if not servers:
                return

            async with httpx.AsyncClient() as client:
                for server in servers:
                    res = await self.check_server(client, server.id, server.url)
                    
                    old_state = "HEALTHY" if server.is_healthy else "UNHEALTHY"
                    new_state = old_state
                    state_changed = False
                    
                    server.last_checked_at = datetime.utcnow()
                    server.last_latency_ms = res["latency_ms"]
                    server.last_status_code = res["status_code"] or 503
                    server.last_error_reason = res["error"]
                    
                    if res["is_up"]:
                        server.cpu_usage = res["cpu"]
                        server.memory_usage = res["memory"]
                        server.consecutive_successes += 1
                        server.consecutive_failures = 0
                        
                        # Check for recovery transition
                        if not server.is_healthy:
                            if server.consecutive_successes >= self.recovery_threshold:
                                server.is_healthy = True
                                new_state = "HEALTHY"
                                state_changed = True
                                logger.info(f"Server {server.id} RECOVERED after {server.consecutive_successes} checks!")
                    else:
                        server.consecutive_failures += 1
                        server.consecutive_successes = 0
                        
                        # Check for failure transition
                        if server.is_healthy:
                            if server.consecutive_failures >= self.failure_threshold:
                                server.is_healthy = False
                                new_state = "UNHEALTHY"
                                state_changed = True
                                logger.warning(f"Server {server.id} MARKED UNHEALTHY after {server.consecutive_failures} failures: {res['error']}")
                    
                    # Persist check log
                    check_log = HealthCheckLog(
                        server_id=server.id,
                        server_name=server.name,
                        status_code=res["status_code"],
                        latency_ms=res["latency_ms"],
                        is_successful=res["is_up"],
                        failure_reason=res["error"],
                        old_state=old_state,
                        new_state=new_state
                    )
                    db.add(check_log)
                    
                    if state_changed:
                        audit = AuditLog(
                            username="SYSTEM_MONITOR",
                            role="SYSTEM",
                            action=f"STATE_TRANSITION_{new_state}",
                            target_type="SERVER",
                            target_id=server.id,
                            details=f"Server {server.name} changed status from {old_state} to {new_state}. Reason: {res['error'] or 'Passed recovery checks'}"
                        )
                        db.add(audit)
                    
            db.commit()
        except Exception as exc:
            db.rollback()
            logger.error(f"Error during health check pass: {exc}")
        finally:
            db.close()

    async def _loop(self):
        while self.is_running:
            try:
                await self.run_check_cycle()
            except Exception as e:
                logger.error(f"Health monitor loop error: {e}")
            await asyncio.sleep(self.interval)

    def start(self):
        if not self.is_running:
            self.is_running = True
            self._task = asyncio.create_task(self._loop())
            logger.info("Health Monitor started.")

    def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()
            logger.info("Health Monitor stopped.")

health_monitor = HealthMonitor()
