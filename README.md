# Backend & Infrastructure Engineer — Work Package

## Role Responsibility
Owns the **platform foundation**: backend servers, data layer, security, API skeleton, and deployment.

## What is included in this folder

### Backend Servers (`backend/servers/`)
- `server_instance.py` — Reusable backend server implementation
- `run_server_a.py` / `run_server_b.py` / `run_server_c.py` — Three independent nodes (ports 8001–8003)

### Core Platform (`backend/app/`)
- `config.py` — Application settings
- `database.py` — SQLAlchemy / DB setup
- `main.py` — FastAPI application factory, lifespan, static mounting
- `models/` — Database models (User, BackendServer, Experiment, etc.)
- `schemas/` — Pydantic schemas
- `core/security.py` — Password hashing, JWT, RBAC helpers

### API Structure & Endpoints
- `api/v1/api.py` — Router aggregation
- `auth.py` — Login / JWT token
- `users.py` — User management
- `servers.py` — Backend server registration & status
- `logs.py` — Log retrieval

### Enterprise Modules
- `rate_limiting/` — Rate limiting workers
- `protocols/` — Protocol handling workers
- `policies/` — Policy engine workers

### Services
- `audit_service.py` — Audit logging

### Infrastructure & Deployment
- `docker/` — docker-compose.yml, Dockerfile.backend, Dockerfile.lb
- Root `Dockerfile`, `Makefile`, `requirements.txt`, `example.env`
- `main.py` / `app.py` — Entry points
- `scripts/run_all.py` — Starts all three servers + load balancer

### Tests
- `test_auth_rbac.py`
- `test_backend_servers.py`
- `conftest.py`

## Key Deliverables of this Role
1. Three independent backend server processes
2. Database models + seeding of default users & servers
3. JWT Authentication + Role-Based Access Control (Admin / Operator / Analyst)
4. Docker Compose multi-service deployment
5. Project configuration, dependency management, and startup scripts
