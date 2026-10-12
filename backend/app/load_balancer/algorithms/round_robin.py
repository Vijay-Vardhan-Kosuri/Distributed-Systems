"""
Round Robin Load Balancing Algorithm
Sequentially distributes incoming requests across eligible backend servers.
"""

import asyncio
from typing import List, Optional
from backend.app.models.base import BackendServer

class RoundRobinBalancer:
    def __init__(self):
        self._index = 0
        self._lock = asyncio.Lock()
    
    async def select_server(self, eligible_servers: List[BackendServer]) -> Optional[BackendServer]:
        """
        Selects next eligible server using round-robin index.
        Thread/async safe with lock.
        """
        if not eligible_servers:
            return None
            
        async with self._lock:
            # Sort servers by ID for deterministic cyclic order
            sorted_servers = sorted(eligible_servers, key=lambda s: s.id)
            selected = sorted_servers[self._index % len(sorted_servers)]
            self._index = (self._index + 1) % len(sorted_servers)
            return selected
