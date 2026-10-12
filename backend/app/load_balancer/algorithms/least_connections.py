"""
Least Connections Load Balancing Algorithm
Selects the eligible backend server currently serving the fewest active requests.
"""

from typing import List, Optional
from backend.app.models.base import BackendServer

class LeastConnectionsBalancer:
    async def select_server(self, eligible_servers: List[BackendServer]) -> Optional[BackendServer]:
        """
        Selects eligible server with lowest active_connections.
        Ties are broken by lowest historical total requests or server id.
        """
        if not eligible_servers:
            return None
            
        # Sort key: (active_connections, total_requests, id)
        sorted_servers = sorted(
            eligible_servers,
            key=lambda s: (s.active_connections, s.total_requests, s.id)
        )
        return sorted_servers[0]
