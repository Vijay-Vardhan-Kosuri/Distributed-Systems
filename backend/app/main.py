"""
LoadSphere Central FastAPI Application
Coordinates Load Balancer REST APIs, Health Monitoring, Static Web UI, and System Initialization.
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from backend.app.config import settings
from backend.app.database import engine, Base, SessionLocal
from backend.app.models.base import User, BackendServer, UserRole, Experiment, ExperimentResult
from backend.app.core.security import hash_password
from backend.app.load_balancer.health_monitor import health_monitor
from backend.app.api.v1.api import api_router

def init_db_data():
    """Seeds default accounts, backend servers, and baseline experiments."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Default Users for 3 Roles
        if not db.query(User).filter(User.username == "admin").first():
            db.add(User(
                username="admin",
                email="admin@loadsphere.enterprise",
                full_name="Enterprise Administrator",
                hashed_password=hash_password("admin123"),
                role=UserRole.ADMIN
            ))
        if not db.query(User).filter(User.username == "operator").first():
            db.add(User(
                username="operator",
                email="operator@loadsphere.enterprise",
                full_name="Operations Engineer",
                hashed_password=hash_password("operator123"),
                role=UserRole.OPERATOR
            ))
        if not db.query(User).filter(User.username == "analyst").first():
            db.add(User(
                username="analyst",
                email="analyst@loadsphere.enterprise",
                full_name="Performance Analyst",
                hashed_password=hash_password("analyst123"),
                role=UserRole.ANALYST
            ))

        # Three Backend Servers
        servers_config = [
            ("server_a", "Server A", "127.0.0.1", 8001, settings.SERVER_A_URL),
            ("server_b", "Server B", "127.0.0.1", 8002, settings.SERVER_B_URL),
            ("server_c", "Server C", "127.0.0.1", 8003, settings.SERVER_C_URL),
        ]
        for s_id, s_name, s_host, s_port, s_url in servers_config:
            existing = db.query(BackendServer).filter(BackendServer.id == s_id).first()
            if not existing:
                db.add(BackendServer(
                    id=s_id,
                    name=s_name,
                    host=s_host,
                    port=s_port,
                    url=s_url,
                    is_enabled=True,
                    is_healthy=True,
                    weight=1.0,
                    active_connections=0,
                    total_requests=0
                ))

        # Baseline experiments for immediate comparative analysis
        if not db.query(Experiment).first():
            exp1 = Experiment(
                id="EXP-ROUND-ROBIN-BASELINE",
                name="Round Robin Baseline Workload (1000 requests)",
                description="Uniform distribution benchmark under 20 concurrent virtual users",
                algorithm="ROUND_ROBIN",
                virtual_users=20,
                spawn_rate=5,
                duration_seconds=30,
                target_endpoint="/api/process",
                status="COMPLETED",
                created_by="analyst"
            )
            res1 = ExperimentResult(
                experiment_id="EXP-ROUND-ROBIN-BASELINE",
                total_requests=1000,
                successful_requests=1000,
                failed_requests=0,
                avg_latency_ms=18.4,
                p95_latency_ms=28.1,
                min_latency_ms=12.0,
                max_latency_ms=45.2,
                throughput_rps=33.3,
                error_rate=0.0,
                server_a_requests=334,
                server_b_requests=333,
                server_c_requests=333,
                load_imbalance_cv=0.0017
            )
            
            exp2 = Experiment(
                id="EXP-LEAST-CONN-BASELINE",
                name="Least Connections Under Heterogeneous Latency",
                description="Dynamic concurrency distribution with artificial delay on Server B",
                algorithm="LEAST_CONNECTIONS",
                virtual_users=20,
                spawn_rate=5,
                duration_seconds=30,
                target_endpoint="/api/process",
                status="COMPLETED",
                created_by="analyst"
            )
            res2 = ExperimentResult(
                experiment_id="EXP-LEAST-CONN-BASELINE",
                total_requests=985,
                successful_requests=985,
                failed_requests=0,
                avg_latency_ms=16.8,
                p95_latency_ms=24.5,
                min_latency_ms=11.5,
                max_latency_ms=39.0,
                throughput_rps=32.8,
                error_rate=0.0,
                server_a_requests=395,
                server_b_requests=195,
                server_c_requests=395,
                load_imbalance_cv=0.3175
            )

            exp3 = Experiment(
                id="EXP-DYNAMIC-LOAD-BALANCING",
                name="Dynamic Scoring (Active Conns + Latency + CPU Load)",
                description="Holistic penalty score algorithm maximizing cluster throughput and minimizing P95 latency",
                algorithm="DYNAMIC",
                virtual_users=20,
                spawn_rate=5,
                duration_seconds=30,
                target_endpoint="/api/process",
                status="COMPLETED",
                created_by="analyst"
            )
            res3 = ExperimentResult(
                experiment_id="EXP-DYNAMIC-LOAD-BALANCING",
                total_requests=1042,
                successful_requests=1042,
                failed_requests=0,
                avg_latency_ms=15.2,
                p95_latency_ms=21.4,
                min_latency_ms=10.8,
                max_latency_ms=34.1,
                throughput_rps=34.7,
                error_rate=0.0,
                server_a_requests=382,
                server_b_requests=280,
                server_c_requests=380,
                load_imbalance_cv=0.1418
            )

            db.add(exp1)
            db.add(res1)
            db.add(exp2)
            db.add(res2)
            db.add(exp3)
            db.add(res3)

        db.commit()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db_data()
    health_monitor.start()
    yield
    # Shutdown
    health_monitor.stop()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(api_router, prefix="/api/v1")

# Load Balancer Health check
@app.get("/health")
def lb_health():
    """Load Balancer internal health check."""
    return {
        "status": "HEALTHY",
        "service": "LoadSphere Central Load Balancer",
        "version": settings.VERSION,
        "health_monitor_running": health_monitor.is_running
    }

# Mount Frontend Static Assets
frontend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend", "static")
if os.path.exists(frontend_path):
    app.mount("/static", StaticFiles(directory=frontend_path), name="static")

@app.get("/")
@app.get("/login")
def serve_index():
    """Serves the Single Page Application index.html."""
    index_file = os.path.join(frontend_path, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "LoadSphere Enterprise Load Balancer is Running. API available at /api/v1"}

