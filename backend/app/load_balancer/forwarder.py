"""
HTTP Request Forwarder with Connection Tracking and Error Isolation
"""

import uuid
import asyncio
import httpx
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import Request, Response
from backend.app.database import SessionLocal
from backend.app.models.base import BackendServer, RequestLog
from backend.app.load_balancer.balancer import lb_coordinator

class RequestForwarder:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=10.0)

    async def forward_request(
        self,
        request: Request,
        path: str,
        override_algo: Optional[str] = None
    ) -> Response:
        """
        Distributes request to an eligible backend server.
        Handles connection counters and error logs.
        """
        request_id = str(uuid.uuid4())
        start_time = asyncio.get_event_loop().time()
        client_ip = request.client.host if request.client else "127.0.0.1"
        method = request.method
        body = await request.body()
        headers = dict(request.headers)
        headers.pop("host", None)
        headers["x-request-id"] = request_id

        db = SessionLocal()
        selected_server = None
        server_id = None
        server_name = None
        algo_used = override_algo or lb_coordinator.get_algorithm()
        
        try:
            # 1. Query eligible servers: both is_enabled AND is_healthy must be True!
            eligible_servers = db.query(BackendServer).filter(
                BackendServer.is_enabled == True,
                BackendServer.is_healthy == True
            ).all()

            if not eligible_servers:
                duration_ms = (asyncio.get_event_loop().time() - start_time) * 1000.0
                req_log = RequestLog(
                    request_id=request_id,
                    client_ip=client_ip,
                    method=method,
                    path=path,
                    selected_server_id=None,
                    selected_server_name=None,
                    algorithm_used=algo_used,
                    response_status=503,
                    duration_ms=round(duration_ms, 2),
                    error_detail="No eligible backend servers available (all down or in maintenance)"
                )
                db.add(req_log)
                db.commit()
                return Response(
                    content='{"detail": "Service Unavailable: No healthy backend servers available"}',
                    status_code=503,
                    media_type="application/json",
                    headers={"x-loadsphere-id": request_id}
                )

            # 2. Select backend via algorithm
            selected_server = await lb_coordinator.pick_backend(eligible_servers, override_algo=algo_used)
            server_id = selected_server.id
            server_name = selected_server.name
            target_url = f"{selected_server.url.rstrip('/')}/{path.lstrip('/')}"

            # 3. Increment active connections
            selected_server.active_connections += 1
            selected_server.total_requests += 1
            db.commit()

        finally:
            db.close()

        # 4. Proxy request with strict exception handling & decrement active connections
        response_status = 502
        resp_body = b""
        resp_headers = {}
        error_detail = None

        try:
            resp = await self.client.request(
                method=method,
                url=target_url,
                content=body,
                headers=headers,
                params=dict(request.query_params)
            )
            response_status = resp.status_code
            resp_body = resp.content
            resp_headers = dict(resp.headers)
            resp_headers["x-loadsphere-server"] = server_name
            resp_headers["x-loadsphere-algorithm"] = algo_used
            resp_headers["x-loadsphere-id"] = request_id
        except httpx.TimeoutException:
            response_status = 504
            resp_body = b'{"detail": "Gateway Timeout: Backend server did not respond in time"}'
            error_detail = "Gateway Timeout"
        except Exception as exc:
            response_status = 502
            resp_body = f'{{"detail": "Bad Gateway: Backend connection failure: {str(exc)}"}}'.encode()
            error_detail = str(exc)
        finally:
            # 5. Decrement active connections in DB (guaranteed cleanup)
            duration_ms = (asyncio.get_event_loop().time() - start_time) * 1000.0
            db_clean = SessionLocal()
            try:
                srv = db_clean.query(BackendServer).filter(BackendServer.id == server_id).first()
                if srv:
                    srv.active_connections = max(0, srv.active_connections - 1)
                    if 200 <= response_status < 400:
                        srv.successful_requests += 1
                    else:
                        srv.failed_requests += 1
                
                req_log = RequestLog(
                    request_id=request_id,
                    client_ip=client_ip,
                    method=method,
                    path=path,
                    selected_server_id=server_id,
                    selected_server_name=server_name,
                    algorithm_used=algo_used,
                    response_status=response_status,
                    duration_ms=round(duration_ms, 2),
                    error_detail=error_detail
                )
                db_clean.add(req_log)
                db_clean.commit()
            except Exception:
                db_clean.rollback()
            finally:
                db_clean.close()

        return Response(
            content=resp_body,
            status_code=response_status,
            headers=resp_headers,
            media_type=resp_headers.get("content-type", "application/json")
        )

forwarder = RequestForwarder()
