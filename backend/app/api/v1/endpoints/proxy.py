"""
Traffic Forwarding Proxy Endpoint
Central gateway that distributes requests using the active load-balancing algorithm.
"""
from typing import Optional
from fastapi import APIRouter, Request
from backend.app.load_balancer.forwarder import forwarder

router = APIRouter(prefix="/proxy")

@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def route_traffic(request: Request, path: str, algo: Optional[str] = None):
    """Forwards incoming HTTP request through the load balancer."""
    return await forwarder.forward_request(request, path, override_algo=algo)
