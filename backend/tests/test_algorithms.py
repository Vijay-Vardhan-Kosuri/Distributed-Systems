"""
Unit Tests for Routing Algorithms using standard asyncio.run
"""

import asyncio
import pytest
from backend.app.models.base import BackendServer
from backend.app.load_balancer.algorithms.round_robin import RoundRobinBalancer
from backend.app.load_balancer.algorithms.least_connections import LeastConnectionsBalancer
from backend.app.load_balancer.algorithms.dynamic_balancer import DynamicBalancer

def test_round_robin():
    async def _run():
        rr = RoundRobinBalancer()
        s1 = BackendServer(id="server_a", name="A")
        s2 = BackendServer(id="server_b", name="B")
        s3 = BackendServer(id="server_c", name="C")
        pool = [s1, s2, s3]

        assert (await rr.select_server(pool)).id == "server_a"
        assert (await rr.select_server(pool)).id == "server_b"
        assert (await rr.select_server(pool)).id == "server_c"
        assert (await rr.select_server(pool)).id == "server_a"
    asyncio.run(_run())

def test_round_robin_empty_pool():
    async def _run():
        rr = RoundRobinBalancer()
        assert (await rr.select_server([])) is None
    asyncio.run(_run())

def test_least_connections():
    async def _run():
        lc = LeastConnectionsBalancer()
        s1 = BackendServer(id="server_a", active_connections=5, total_requests=10)
        s2 = BackendServer(id="server_b", active_connections=1, total_requests=10) # lowest
        s3 = BackendServer(id="server_c", active_connections=3, total_requests=10)
        pool = [s1, s2, s3]

        picked = await lc.select_server(pool)
        assert picked.id == "server_b"
    asyncio.run(_run())

def test_least_connections_tie_breaking():
    async def _run():
        lc = LeastConnectionsBalancer()
        s1 = BackendServer(id="server_a", active_connections=2, total_requests=15)
        s2 = BackendServer(id="server_b", active_connections=2, total_requests=8) # fewer total reqs
        pool = [s1, s2]

        picked = await lc.select_server(pool)
        assert picked.id == "server_b"
    asyncio.run(_run())

def test_dynamic_balancer():
    async def _run():
        dyn = DynamicBalancer(weight_conn=0.4, weight_lat=0.4, weight_load=0.2)
        s1 = BackendServer(id="server_a", active_connections=10, last_latency_ms=100.0, cpu_usage=80.0, weight=1.0)
        s2 = BackendServer(id="server_b", active_connections=1, last_latency_ms=15.0, cpu_usage=20.0, weight=1.0)
        
        score_s1 = dyn.calculate_score(s1)
        score_s2 = dyn.calculate_score(s2)
        
        assert score_s2 < score_s1 # Lower score is preferable
        picked = await dyn.select_server([s1, s2])
        assert picked.id == "server_b"
    asyncio.run(_run())
