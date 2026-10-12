"""
SQLAlchemy Data Models for LoadSphere
"""

import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, Enum, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    OPERATOR = "OPERATOR"
    ANALYST = "ANALYST"

class AlgorithmType(str, enum.Enum):
    ROUND_ROBIN = "ROUND_ROBIN"
    LEAST_CONNECTIONS = "LEAST_CONNECTIONS"
    DYNAMIC = "DYNAMIC"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    hashed_password = Column(String(200), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.OPERATOR, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class BackendServer(Base):
    __tablename__ = "backend_servers"
    
    id = Column(String(50), primary_key=True, index=True) # server_a, server_b, server_c
    name = Column(String(100), nullable=False)
    host = Column(String(100), nullable=False)
    port = Column(Integer, nullable=False)
    url = Column(String(200), nullable=False)
    
    is_enabled = Column(Boolean, default=True) # Administrative enablement
    is_healthy = Column(Boolean, default=True) # Actual health status
    weight = Column(Float, default=1.0)
    
    consecutive_failures = Column(Integer, default=0)
    consecutive_successes = Column(Integer, default=0)
    
    active_connections = Column(Integer, default=0)
    total_requests = Column(Integer, default=0)
    successful_requests = Column(Integer, default=0)
    failed_requests = Column(Integer, default=0)
    
    last_checked_at = Column(DateTime, nullable=True)
    last_latency_ms = Column(Float, default=0.0)
    last_status_code = Column(Integer, default=200)
    last_error_reason = Column(String(255), nullable=True)
    
    cpu_usage = Column(Float, default=10.0)
    memory_usage = Column(Float, default=25.0)
    
    health_logs = relationship("HealthCheckLog", back_populates="server", cascade="all, delete-orphan")

class HealthCheckLog(Base):
    __tablename__ = "health_check_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    server_id = Column(String(50), ForeignKey("backend_servers.id"), index=True, nullable=False)
    server_name = Column(String(100), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    status_code = Column(Integer, nullable=True)
    latency_ms = Column(Float, default=0.0)
    is_successful = Column(Boolean, default=True)
    failure_reason = Column(String(255), nullable=True)
    old_state = Column(String(50), nullable=True)
    new_state = Column(String(50), nullable=True)
    
    server = relationship("BackendServer", back_populates="health_logs")

class RequestLog(Base):
    __tablename__ = "request_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(String(64), index=True, nullable=False)
    client_ip = Column(String(50), nullable=True)
    method = Column(String(10), nullable=False)
    path = Column(String(255), nullable=False)
    selected_server_id = Column(String(50), index=True, nullable=True)
    selected_server_name = Column(String(100), nullable=True)
    algorithm_used = Column(String(50), nullable=False)
    response_status = Column(Integer, nullable=False)
    duration_ms = Column(Float, default=0.0)
    error_detail = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

class MetricSnapshot(Base):
    __tablename__ = "metric_snapshots"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    total_requests = Column(Integer, default=0)
    active_requests = Column(Integer, default=0)
    avg_latency_ms = Column(Float, default=0.0)
    p95_latency_ms = Column(Float, default=0.0)
    throughput_rps = Column(Float, default=0.0)
    error_rate = Column(Float, default=0.0)
    healthy_servers = Column(Integer, default=3)
    active_algorithm = Column(String(50), default="ROUND_ROBIN")

class Experiment(Base):
    __tablename__ = "experiments"
    
    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    algorithm = Column(Enum(AlgorithmType), nullable=False)
    virtual_users = Column(Integer, default=10)
    spawn_rate = Column(Integer, default=2)
    duration_seconds = Column(Integer, default=30)
    target_endpoint = Column(String(200), default="/api/process")
    status = Column(String(30), default="COMPLETED") # RUNNING, COMPLETED, FAILED, STOPPED
    created_by = Column(String(50), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    
    result = relationship("ExperimentResult", back_populates="experiment", uselist=False, cascade="all, delete-orphan")

class ExperimentResult(Base):
    __tablename__ = "experiment_results"
    
    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(String(50), ForeignKey("experiments.id"), unique=True, nullable=False)
    total_requests = Column(Integer, default=0)
    successful_requests = Column(Integer, default=0)
    failed_requests = Column(Integer, default=0)
    avg_latency_ms = Column(Float, default=0.0)
    p95_latency_ms = Column(Float, default=0.0)
    min_latency_ms = Column(Float, default=0.0)
    max_latency_ms = Column(Float, default=0.0)
    throughput_rps = Column(Float, default=0.0)
    error_rate = Column(Float, default=0.0)
    server_a_requests = Column(Integer, default=0)
    server_b_requests = Column(Integer, default=0)
    server_c_requests = Column(Integer, default=0)
    load_imbalance_cv = Column(Float, default=0.0) # Coefficient of Variation
    created_at = Column(DateTime, default=datetime.utcnow)
    
    experiment = relationship("Experiment", back_populates="result")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    username = Column(String(50), nullable=False)
    role = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False)
    target_type = Column(String(50), nullable=False) # SERVER, ALGORITHM, USER, EXPERIMENT
    target_id = Column(String(100), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
