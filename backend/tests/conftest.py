"""
Pytest Fixtures and Test Environment Setup
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.database import Base
from backend.app.models.base import BackendServer, User, UserRole
from backend.app.core.security import hash_password

TEST_DB_URL = "sqlite:///:memory:"

@pytest.fixture(scope="function")
def test_db():
    engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Seed mock servers
    s_a = BackendServer(id="server_a", name="Server A", host="127.0.0.1", port=8001, url="http://127.0.0.1:8001", is_enabled=True, is_healthy=True, active_connections=0, total_requests=0)
    s_b = BackendServer(id="server_b", name="Server B", host="127.0.0.1", port=8002, url="http://127.0.0.1:8002", is_enabled=True, is_healthy=True, active_connections=0, total_requests=0)
    s_c = BackendServer(id="server_c", name="Server C", host="127.0.0.1", port=8003, url="http://127.0.0.1:8003", is_enabled=True, is_healthy=True, active_connections=0, total_requests=0)
    
    admin = User(username="admin", email="admin@test.com", full_name="Admin", hashed_password=hash_password("admin123"), role=UserRole.ADMIN)
    analyst = User(username="analyst", email="analyst@test.com", full_name="Analyst", hashed_password=hash_password("analyst123"), role=UserRole.ANALYST)
    
    db.add_all([s_a, s_b, s_c, admin, analyst])
    db.commit()
    
    yield db
    
    db.close()
    Base.metadata.drop_all(bind=engine)
