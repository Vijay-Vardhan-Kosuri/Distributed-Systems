"""
Dynamic Load Balancing Algorithm
Calculates a composite health & capacity score for each eligible backend server.
Lower score indicates a more preferable destination.

Scoring Formula:
Score_i = (w_conn * active_connections_i) +
          (w_lat * (last_latency_ms_i / 10.0)) +
          (w_load * (cpu_usage_i / 10.0))

Where:
- w_conn: weight for active connections (default: 0.4)
- w_lat: weight for recent response latency (default: 0.4)
- w_load: weight for server resource utilization (default: 0.2)
"""

from typing import List, Optional
from backend.app.models.base import BackendServer
from backend.app.config import settings

class DynamicBalancer:
    def __init__(self, weight_conn: float = 0.4, weight_lat: float = 0.4, weight_load: float = 0.2):
        self.w_conn = weight_conn
        self.w_lat = weight_lat
        self.w_load = weight_load

    def set_weights(self, w_conn: float, w_lat: float, w_load: float):
        self.w_conn = w_conn
        self.w_lat = w_lat
        self.w_load = w_load

    def calculate_score(self, server: BackendServer) -> float:
        """
        Computes composite routing penalty score. Lower is better.
        Takes weight multiplier into account (servers with higher configured weight get a bonus/reduction).
        """
        # Base metrics
        active = max(0, server.active_connections)
        latency_factor = max(0.0, server.last_latency_ms) / 10.0
        load_factor = max(0.0, server.cpu_usage) / 10.0

        raw_score = (self.w_conn * active) + (self.w_lat * latency_factor) + (self.w_load * load_factor)

        # Apply server administrative weight (higher weight => lower effective penalty score)
        effective_weight = max(0.1, server.weight)
        score = raw_score / effective_weight
        return round(score, 4)

    async def select_server(self, eligible_servers: List[BackendServer]) -> Optional[BackendServer]:
        """
        Selects server with lowest dynamic composite score.
        """
        if not eligible_servers:
            return None

        scored = [(server, self.calculate_score(server)) for server in eligible_servers]
        # Sort by score ascending, then by server id
        scored.sort(key=lambda item: (item[1], item[0].id))
        return scored[0][0]
