"""
System Logs & Audit Trail Endpoints
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.base import RequestLog, HealthCheckLog, AuditLog
from backend.app.schemas.schemas import RequestLogResponse, HealthCheckLogResponse, AuditLogResponse

router = APIRouter()

@router.get("/requests", response_model=List[RequestLogResponse])
def get_request_logs(
    limit: int = 50,
    server_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Returns recent HTTP request routing logs."""
    q = db.query(RequestLog)
    if server_id:
        q = q.filter(RequestLog.selected_server_id == server_id)
    return q.order_by(RequestLog.id.desc()).limit(limit).all()

@router.get("/health-checks", response_model=List[HealthCheckLogResponse])
def get_health_check_logs(
    limit: int = 50,
    server_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Returns recent health monitor check records."""
    q = db.query(HealthCheckLog)
    if server_id:
        q = q.filter(HealthCheckLog.server_id == server_id)
    return q.order_by(HealthCheckLog.id.desc()).limit(limit).all()

@router.get("/audit", response_model=List[AuditLogResponse])
def get_audit_logs(limit: int = 50, db: Session = Depends(get_db)):
    """Returns system administrative audit trail."""
    return db.query(AuditLog).order_by(AuditLog.id.desc()).limit(limit).all()
