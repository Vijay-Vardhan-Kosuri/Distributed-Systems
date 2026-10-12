"""
LoadSphere Central Configuration Module
Handles environment variables and system defaults.
"""

import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "LoadSphere — Dynamic Load Balancing and Server Monitoring System"
    VERSION: str = "1.0.0"
    HOST: str = os.getenv("LOADSPHERE_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("LOADSPHERE_PORT", "8000"))
    
    # Backend Server Endpoints
    SERVER_A_URL: str = os.getenv("SERVER_A_URL", "http://localhost:8001")
    SERVER_B_URL: str = os.getenv("SERVER_B_URL", "http://localhost:8002")
    SERVER_C_URL: str = os.getenv("SERVER_C_URL", "http://localhost:8003")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./loadsphere.db")
    
    # Health Monitoring Defaults
    HEALTH_CHECK_INTERVAL: float = float(os.getenv("HEALTH_CHECK_INTERVAL", "5.0"))
    HEALTH_CHECK_TIMEOUT: float = float(os.getenv("HEALTH_CHECK_TIMEOUT", "2.0"))
    CONSECUTIVE_FAILURES_THRESHOLD: int = int(os.getenv("FAILURE_THRESHOLD", "3"))
    CONSECUTIVE_SUCCESSES_THRESHOLD: int = int(os.getenv("RECOVERY_THRESHOLD", "3"))
    
    # Load Balancing
    DEFAULT_ALGORITHM: str = os.getenv("DEFAULT_ALGORITHM", "ROUND_ROBIN") # ROUND_ROBIN, LEAST_CONNECTIONS, DYNAMIC
    WEIGHT_CONNECTIONS: float = float(os.getenv("WEIGHT_CONNECTIONS", "0.4"))
    WEIGHT_LATENCY: float = float(os.getenv("WEIGHT_LATENCY", "0.4"))
    WEIGHT_LOAD: float = float(os.getenv("WEIGHT_LOAD", "0.2"))
    
    # Security & RBAC
    SECRET_KEY: str = os.getenv("SECRET_KEY", "loadsphere-enterprise-secret-key-distributed-systems")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 24 hours
    
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

settings = Settings()
