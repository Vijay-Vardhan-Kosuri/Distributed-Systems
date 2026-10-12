"""
API Router Aggregator
"""

from fastapi import APIRouter
from backend.app.api.v1.endpoints import (
    auth, servers, metrics, algorithm, tests,
    experiments, reports, users, logs, proxy
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(servers.router, prefix="/servers", tags=["Servers"])
api_router.include_router(metrics.router, prefix="/metrics", tags=["Metrics"])
api_router.include_router(algorithm.router, prefix="/algorithm", tags=["Algorithm"])
api_router.include_router(tests.router, prefix="/tests", tags=["Load Tests"])
api_router.include_router(experiments.router, prefix="/experiments", tags=["Experiments"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(logs.router, prefix="/logs", tags=["Logs"])
api_router.include_router(proxy.router, prefix="/proxy", tags=["Traffic Proxy"])
