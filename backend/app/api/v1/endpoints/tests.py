"""
Load Testing and Workload Generation Endpoints
"""

import uuid
import asyncio
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.base import Experiment, User
from backend.app.schemas.schemas import ExperimentCreate
from backend.app.core.security import require_analyst, get_current_user
from backend.app.services.test_runner import test_runner
from backend.app.services.audit_service import audit_service
from backend.app.config import settings

router = APIRouter()

@router.post("")
def start_load_test(
    exp_in: ExperimentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst)
):
    """Starts a live load test against the load balancer."""
    exp_id = f"EXP-{uuid.uuid4().hex[:8].upper()}"
    exp = Experiment(
        id=exp_id,
        name=exp_in.name,
        description=exp_in.description,
        algorithm=exp_in.algorithm,
        virtual_users=exp_in.virtual_users,
        spawn_rate=exp_in.spawn_rate,
        duration_seconds=exp_in.duration_seconds,
        target_endpoint=exp_in.target_endpoint,
        status="RUNNING",
        created_by=current_user.username
    )
    db.add(exp)
    db.commit()

    lb_base_url = f"http://127.0.0.1:{settings.PORT}"
    background_tasks.add_task(
        test_runner.execute_test,
        exp_id,
        lb_base_url,
        exp_in.virtual_users,
        exp_in.spawn_rate,
        exp_in.duration_seconds,
        exp_in.algorithm,
        exp_in.target_endpoint
    )

    audit_service.record_action(
        db, current_user.username, current_user.role.value,
        "START_LOAD_TEST", "EXPERIMENT", exp_id,
        f"Launched experiment '{exp_in.name}' ({exp_in.algorithm}, {exp_in.virtual_users} users, {exp_in.duration_seconds}s)"
    )

    return {"status": "STARTED", "experiment_id": exp_id}

@router.get("/{experiment_id}")
def get_test_status(experiment_id: str, db: Session = Depends(get_db)):
    """Retrieves live running progress or completed results of a test."""
    live = test_runner.active_tests.get(experiment_id)
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")

    return {
        "id": exp.id,
        "name": exp.name,
        "algorithm": exp.algorithm.value if hasattr(exp.algorithm, "value") else str(exp.algorithm),
        "status": exp.status,
        "live": live,
        "result": exp.result
    }

@router.post("/{experiment_id}/stop")
def stop_load_test(
    experiment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst)
):
    """Prematurely stops an active load test."""
    test_runner.stop_test(experiment_id)
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if exp:
        exp.status = "STOPPED"
        db.commit()
    return {"status": "STOP_REQUESTED", "experiment_id": experiment_id}
