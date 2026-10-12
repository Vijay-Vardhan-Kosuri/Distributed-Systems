"""
Central Load Balancer Coordinator
Holds algorithm implementations and orchestrates server selection.
"""

from typing import List, Optional
from backend.app.config import settings
from backend.app.models.base import BackendServer, AlgorithmType
from backend.app.load_balancer.algorithms.round_robin import RoundRobinBalancer
from backend.app.load_balancer.algorithms.least_connections import LeastConnectionsBalancer
from backend.app.load_balancer.algorithms.dynamic_balancer import DynamicBalancer

class LoadBalancerCoordinator:
    def __init__(self):
        self.active_algorithm: str = settings.DEFAULT_ALGORITHM
        self.rr = RoundRobinBalancer()
        self.lc = LeastConnectionsBalancer()
        self.dyn = DynamicBalancer(
            weight_conn=settings.WEIGHT_CONNECTIONS,
            weight_lat=settings.WEIGHT_LATENCY,
            weight_load=settings.WEIGHT_LOAD
        )
        
    def set_algorithm(self, algo: str):
        if algo not in [AlgorithmType.ROUND_ROBIN.value, AlgorithmType.LEAST_CONNECTIONS.value, AlgorithmType.DYNAMIC.value]:
            raise ValueError(f"Unknown load balancing algorithm: {algo}")
        self.active_algorithm = algo
        
    def get_algorithm(self) -> str:
        return self.active_algorithm
        
    def set_dynamic_weights(self, w_conn: float, w_lat: float, w_load: float):
        self.dyn.set_weights(w_conn, w_lat, w_load)

    async def pick_backend(self, eligible_servers: List[BackendServer], override_algo: Optional[str] = None) -> Optional[BackendServer]:
        algo = override_algo or self.active_algorithm
        if algo == AlgorithmType.ROUND_ROBIN.value:
            return await self.rr.select_server(eligible_servers)
        elif algo == AlgorithmType.LEAST_CONNECTIONS.value:
            return await self.lc.select_server(eligible_servers)
        elif algo == AlgorithmType.DYNAMIC.value:
            return await self.dyn.select_server(eligible_servers)
        else:
            return await self.rr.select_server(eligible_servers)

lb_coordinator = LoadBalancerCoordinator()
