"""
System Telemetry & Metrics API
"""

from typing import List, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.base import MetricSnapshot, RequestLog, BackendServer
from backend.app.schemas.schemas import KPISummaryResponse
from backend.app.services.metrics_service import metrics_service

router = APIRouter()

@router.get("/summary", response_model=KPISummaryResponse)
def get_kpi_summary(db: Session = Depends(get_db)):
    """Returns aggregated KPI summary metrics."""
    return metrics_service.get_kpi_summary(db)

@router.get("/history")
def get_metrics_history(db: Session = Depends(get_db)):
    """Returns historical time-series datapoints for latency and throughput charts."""
    # Last 30 requests grouped or recent snapshots
    recent = db.query(RequestLog).order_by(RequestLog.id.desc()).limit(30).all()
    recent.reverse()
    
    chart_points = []
    for r in recent:
        chart_points.append({
            "timestamp": r.timestamp.strftime("%H:%M:%S"),
            "latency_ms": r.duration_ms,
            "server": r.selected_server_name or "None",
            "status": r.response_status
        })
    return chart_points
