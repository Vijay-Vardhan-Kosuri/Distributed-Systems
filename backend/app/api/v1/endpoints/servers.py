"""
Server Management and Simulation Endpoints
"""

import httpx
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.base import BackendServer, User
from backend.app.schemas.schemas import ServerResponse, ServerMaintenanceUpdate, ServerSimulateRequest
from backend.app.core.security import require_operator, require_admin, get_current_user
from backend.app.services.audit_service import audit_service

router = APIRouter()

@router.get("", response_model=List[ServerResponse])
def get_servers(db: Session = Depends(get_db)):
    """Retrieves all backend servers and their operational metrics."""
    servers = db.query(BackendServer).all()
    out = []
    for s in servers:
        out.append(ServerResponse(
            id=s.id,
            name=s.name,
            host=s.host,
            port=s.port,
            url=s.url,
            is_enabled=s.is_enabled,
            is_healthy=s.is_healthy,
            is_eligible=(s.is_enabled and s.is_healthy),
            weight=s.weight,
            consecutive_failures=s.consecutive_failures,
            consecutive_successes=s.consecutive_successes,
            active_connections=s.active_connections,
            total_requests=s.total_requests,
            successful_requests=s.successful_requests,
            failed_requests=s.failed_requests,
            last_checked_at=s.last_checked_at,
            last_latency_ms=s.last_latency_ms,
            last_status_code=s.last_status_code,
            last_error_reason=s.last_error_reason,
            cpu_usage=s.cpu_usage,
            memory_usage=s.memory_usage
        ))
    return out

@router.put("/{server_id}/maintenance")
def update_maintenance(
    server_id: str,
    update_data: ServerMaintenanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator)
):
    """Enables or disables a server for maintenance (Operator or Admin)."""
    server = db.query(BackendServer).filter(BackendServer.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    server.is_enabled = update_data.is_enabled
    if update_data.weight is not None:
        server.weight = max(0.1, min(5.0, update_data.weight))
    db.commit()

    action = "ENABLE_SERVER" if update_data.is_enabled else "DISABLE_FOR_MAINTENANCE"
    audit_service.record_action(
        db, current_user.username, current_user.role.value,
        action, "SERVER", server_id,
        f"Server {server.name} maintenance status set to {server.is_enabled}, weight={server.weight}"
    )

    return {"status": "SUCCESS", "is_enabled": server.is_enabled, "weight": server.weight}

@router.post("/{server_id}/simulate")
async def simulate_server_condition(
    server_id: str,
    sim_data: ServerSimulateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator)
):
    """Triggers failure, artificial delay, or recovery on a backend server."""
    server = db.query(BackendServer).filter(BackendServer.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    target_endpoint = ""
    json_payload = {}
    if sim_data.action == "failure":
        target_endpoint = f"{server.url.rstrip('/')}/api/simulate/failure"
    elif sim_data.action == "recover":
        target_endpoint = f"{server.url.rstrip('/')}/api/simulate/recover"
    elif sim_data.action == "delay":
        target_endpoint = f"{server.url.rstrip('/')}/api/simulate/delay"
        json_payload = {"delay_ms": sim_data.delay_ms or 300.0}
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.post(target_endpoint, json=json_payload)
            audit_service.record_action(
                db, current_user.username, current_user.role.value,
                f"SIMULATE_{sim_data.action.upper()}", "SERVER", server_id,
                f"Simulated {sim_data.action} on {server.name}"
            )
            return {"status": "OK", "backend_response": resp.json()}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to communicate with backend server: {str(exc)}")
