"""
Experiment History & Comparative Analytics
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.base import Experiment, ExperimentResult
from backend.app.schemas.schemas import ExperimentResponse

router = APIRouter()

@router.get("", response_model=List[ExperimentResponse])
def get_experiments(db: Session = Depends(get_db)):
    """Retrieves historical experiments and results."""
    experiments = db.query(Experiment).order_by(Experiment.started_at.desc()).all()
    return experiments

@router.get("/{experiment_id}", response_model=ExperimentResponse)
def get_experiment_details(experiment_id: str, db: Session = Depends(get_db)):
    """Retrieves single experiment details."""
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return exp

@router.get("/{experiment_id}/export/csv")
def export_experiment_csv(experiment_id: str, db: Session = Depends(get_db)):
    """Exports experiment results to CSV."""
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not exp or not exp.result:
        raise HTTPException(status_code=404, detail="Experiment results not found")

    r = exp.result
    csv_content = (
        f"Experiment ID,Name,Algorithm,Users,Duration,Total Requests,Success,Failed,"
        f"Avg Latency (ms),P95 Latency (ms),Throughput (req/s),Error Rate (%),"
        f"Server A Reqs,Server B Reqs,Server C Reqs,Load Imbalance (CV)\n"
        f"{exp.id},{exp.name},{exp.algorithm.value},{exp.virtual_users},{exp.duration_seconds},"
        f"{r.total_requests},{r.successful_requests},{r.failed_requests},"
        f"{r.avg_latency_ms},{r.p95_latency_ms},{r.throughput_rps},{r.error_rate},"
        f"{r.server_a_requests},{r.server_b_requests},{r.server_c_requests},{r.load_imbalance_cv}\n"
    )

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=loadsphere_{exp.id}.csv"}
    )
