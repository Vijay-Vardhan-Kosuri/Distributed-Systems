"""
Asynchronous Load Test Executor & Benchmark Runner
Enables direct UI execution of controlled workload experiments without needing external tools.
Also generates Locust scenarios and test profiles.
"""

import uuid
import asyncio
import time
import httpx
from datetime import datetime
from typing import Dict, Any, Optional
from backend.app.database import SessionLocal
from backend.app.models.base import Experiment, ExperimentResult
from backend.app.services.metrics_service import MetricsService

class LoadTestRunner:
    def __init__(self):
        self.active_tests: Dict[str, Dict[str, Any]] = {}

    async def execute_test(
        self,
        experiment_id: str,
        target_url: str,
        users: int,
        spawn_rate: int,
        duration: int,
        algorithm: str,
        path: str = "/api/process"
    ):
        """Spawns simulated virtual users making requests against the load balancer."""
        self.active_tests[experiment_id] = {
            "status": "RUNNING",
            "progress": 0.0,
            "requests_sent": 0,
            "successes": 0,
            "failures": 0,
            "stop_requested": False
        }
        
        latencies = []
        server_counts = {"server_a": 0, "server_b": 0, "server_c": 0}
        start_time = time.time()
        end_time = start_time + duration
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            semaphore = asyncio.Semaphore(users)
            
            async def worker():
                while time.time() < end_time and not self.active_tests[experiment_id]["stop_requested"]:
                    async with semaphore:
                        req_start = time.time()
                        try:
                            # Forward through LB proxy with specific algorithm header/parameter
                            url = f"{target_url.rstrip('/')}/api/v1/proxy{path}?algo={algorithm}"
                            resp = await client.get(url)
                            req_dur = (time.time() - req_start) * 1000.0
                            latencies.append(req_dur)
                            
                            self.active_tests[experiment_id]["requests_sent"] += 1
                            if 200 <= resp.status_code < 400:
                                self.active_tests[experiment_id]["successes"] += 1
                            else:
                                self.active_tests[experiment_id]["failures"] += 1
                                
                            server_header = resp.headers.get("x-loadsphere-server", "").lower()
                            if "server a" in server_header or "server_a" in server_header:
                                server_counts["server_a"] += 1
                            elif "server b" in server_header or "server_b" in server_header:
                                server_counts["server_b"] += 1
                            elif "server c" in server_header or "server_c" in server_header:
                                server_counts["server_c"] += 1
                                
                        except Exception:
                            self.active_tests[experiment_id]["requests_sent"] += 1
                            self.active_tests[experiment_id]["failures"] += 1
                            
                        # Small pacing delay
                        await asyncio.sleep(0.05)

            # Spawn workers according to spawn rate
            tasks = []
            for _ in range(users):
                tasks.append(asyncio.create_task(worker()))
                await asyncio.sleep(1.0 / max(1, spawn_rate))
                
            # Monitor progress
            while time.time() < end_time and not self.active_tests[experiment_id]["stop_requested"]:
                elapsed = time.time() - start_time
                self.active_tests[experiment_id]["progress"] = round(min(100.0, (elapsed / duration) * 100.0), 1)
                await asyncio.sleep(0.5)

            # Cancel remaining tasks
            for t in tasks:
                t.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)

        actual_duration = max(1.0, time.time() - start_time)
        total_reqs = len(latencies)
        succ = self.active_tests[experiment_id]["successes"]
        fail = self.active_tests[experiment_id]["failures"]
        
        if latencies:
            latencies.sort()
            avg_lat = round(sum(latencies) / len(latencies), 2)
            p95_idx = int(0.95 * len(latencies))
            p95_lat = round(latencies[min(p95_idx, len(latencies) - 1)], 2)
            min_lat = round(min(latencies), 2)
            max_lat = round(max(latencies), 2)
        else:
            avg_lat, p95_lat, min_lat, max_lat = 0.0, 0.0, 0.0, 0.0

        throughput = round(total_reqs / actual_duration, 2)
        err_rate = round((fail / float(max(1, total_reqs))) * 100.0, 2)
        cv = MetricsService.calculate_imbalance_cv(list(server_counts.values()))

        # Save to database
        db = SessionLocal()
        try:
            exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
            if exp:
                exp.status = "COMPLETED" if not self.active_tests[experiment_id]["stop_requested"] else "STOPPED"
                exp.completed_at = datetime.utcnow()
                
                result = ExperimentResult(
                    experiment_id=experiment_id,
                    total_requests=total_reqs,
                    successful_requests=succ,
                    failed_requests=fail,
                    avg_latency_ms=avg_lat,
                    p95_latency_ms=p95_lat,
                    min_latency_ms=min_lat,
                    max_latency_ms=max_lat,
                    throughput_rps=throughput,
                    error_rate=err_rate,
                    server_a_requests=server_counts["server_a"],
                    server_b_requests=server_counts["server_b"],
                    server_c_requests=server_counts["server_c"],
                    load_imbalance_cv=cv
                )
                db.add(result)
                db.commit()
        except Exception:
            db.rollback()
        finally:
            db.close()

        self.active_tests[experiment_id]["status"] = "COMPLETED"
        self.active_tests[experiment_id]["progress"] = 100.0

    def stop_test(self, experiment_id: str):
        if experiment_id in self.active_tests:
            self.active_tests[experiment_id]["stop_requested"] = True

test_runner = LoadTestRunner()
