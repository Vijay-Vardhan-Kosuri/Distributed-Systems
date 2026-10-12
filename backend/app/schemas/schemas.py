"""
Pydantic API Validation Schemas for LoadSphere
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class UserBase(BaseModel):
    username: str
    email: str
    full_name: str
    role: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    username: str
    password: str

class ServerResponse(BaseModel):
    id: str
    name: str
    host: str
    port: int
    url: str
    is_enabled: bool
    is_healthy: bool
    is_eligible: bool
    weight: float
    consecutive_failures: int
    consecutive_successes: int
    active_connections: int
    total_requests: int
    successful_requests: int
    failed_requests: int
    last_checked_at: Optional[datetime]
    last_latency_ms: float
    last_status_code: int
    last_error_reason: Optional[str]
    cpu_usage: float
    memory_usage: float

class ServerMaintenanceUpdate(BaseModel):
    is_enabled: bool
    weight: Optional[float] = 1.0

class ServerSimulateRequest(BaseModel):
    action: str = Field(..., description="failure, delay, recover") # failure, delay, recover
    delay_ms: Optional[float] = 200.0

class AlgorithmConfig(BaseModel):
    algorithm: str # ROUND_ROBIN, LEAST_CONNECTIONS, DYNAMIC
    weight_connections: Optional[float] = 0.4
    weight_latency: Optional[float] = 0.4
    weight_load: Optional[float] = 0.2

class HealthPolicyConfig(BaseModel):
    interval_seconds: float = 5.0
    timeout_seconds: float = 2.0
    failure_threshold: int = 3
    recovery_threshold: int = 3

class ExperimentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    algorithm: str = "ROUND_ROBIN"
    virtual_users: int = 10
    spawn_rate: int = 2
    duration_seconds: int = 20
    target_endpoint: str = "/api/process"

class ExperimentResultResponse(BaseModel):
    total_requests: int
    successful_requests: int
    failed_requests: int
    avg_latency_ms: float
    p95_latency_ms: float
    min_latency_ms: float
    max_latency_ms: float
    throughput_rps: float
    error_rate: float
    server_a_requests: int
    server_b_requests: int
    server_c_requests: int
    load_imbalance_cv: float

class ExperimentResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    algorithm: str
    virtual_users: int
    spawn_rate: int
    duration_seconds: int
    target_endpoint: str
    status: str
    created_by: str
    started_at: datetime
    completed_at: Optional[datetime]
    result: Optional[ExperimentResultResponse]
    class Config:
        from_attributes = True

class KPISummaryResponse(BaseModel):
    total_requests: int
    successful_requests: int
    failed_requests: int
    active_requests: int
    avg_latency_ms: float
    p95_latency_ms: float
    throughput_rps: float
    error_rate: float
    healthy_servers_count: int
    total_servers_count: int
    active_algorithm: str
    load_imbalance_cv: float
    server_distribution: Dict[str, int]
    system_status: str # OPERATIONAL, DEGRADED, CRITICAL

class HealthCheckLogResponse(BaseModel):
    id: int
    server_id: str
    server_name: str
    timestamp: datetime
    status_code: Optional[int]
    latency_ms: float
    is_successful: bool
    failure_reason: Optional[str]
    old_state: Optional[str]
    new_state: Optional[str]
    class Config:
        from_attributes = True

class RequestLogResponse(BaseModel):
    id: int
    request_id: str
    client_ip: Optional[str]
    method: str
    path: str
    selected_server_id: Optional[str]
    selected_server_name: Optional[str]
    algorithm_used: str
    response_status: int
    duration_ms: float
    error_detail: Optional[str]
    timestamp: datetime
    class Config:
        from_attributes = True

class AuditLogResponse(BaseModel):
    id: int
    username: str
    role: str
    action: str
    target_type: str
    target_id: Optional[str]
    details: Optional[str]
    ip_address: Optional[str]
    timestamp: datetime
    class Config:
        from_attributes = True
