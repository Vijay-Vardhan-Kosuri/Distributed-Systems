"""
Algorithm Configuration Endpoints
"""
from fastapi import APIRouter, HTTPException
from backend.app.schemas.schemas import AlgorithmConfig, HealthPolicyConfig
from backend.app.load_balancer.balancer import lb_coordinator
from backend.app.load_balancer.health_monitor import health_monitor

router = APIRouter(prefix="/algorithm")

@router.get("")
def get_current_algorithm():
    """Retrieves active routing algorithm and parameters."""
    return {
        "active_algorithm": lb_coordinator.get_algorithm(),
        "dynamic_weights": {
            "weight_connections": getattr(lb_coordinator.dyn, "w_conn", 0.4),
            "weight_latency": getattr(lb_coordinator.dyn, "w_lat", 0.3),
            "weight_load": getattr(lb_coordinator.dyn, "w_load", 0.3),
        },
        "health_policy": {
            "interval_seconds": health_monitor.interval,
            "timeout_seconds": health_monitor.timeout,
            "failure_threshold": health_monitor.failure_threshold,
            "recovery_threshold": health_monitor.recovery_threshold,
        },
    }

@router.post("")
def set_active_algorithm(config: AlgorithmConfig):
    """Sets the active load-balancing algorithm."""
    try:
        lb_coordinator.set_algorithm(config.algorithm)
        if config.algorithm == "dynamic":
            if hasattr(lb_coordinator.dyn, "w_conn"):
                lb_coordinator.dyn.w_conn = config.weight_connections or 0.4
                lb_coordinator.dyn.w_lat = config.weight_latency or 0.3
                lb_coordinator.dyn.w_load = config.weight_load or 0.3
        return {"status": "ok", "active_algorithm": lb_coordinator.get_algorithm()}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/health-policy")
def update_health_policy(policy: HealthPolicyConfig):
    """Updates health monitoring thresholds."""
    health_monitor.update_policy(
        policy.interval_seconds,
        policy.timeout_seconds,
        policy.failure_threshold,
        policy.recovery_threshold,
    )
    return {"status": "ok", "policy": policy.model_dump()}
