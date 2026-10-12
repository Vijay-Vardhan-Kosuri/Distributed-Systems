"""
Unit Tests for Authentication and RBAC
"""

from backend.app.core.security import hash_password, verify_password, create_access_token, decode_token

def test_password_hashing():
    pwd = "EnterprisePassword2026!"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_jwt_token_creation_and_decoding():
    payload = {"sub": "developer1", "role": "ADMIN"}
    token = create_access_token(payload, expires_delta=300)
    assert token is not None
    
    decoded = decode_token(token)
    assert decoded is not None
    assert decoded["sub"] == "developer1"
    assert decoded["role"] == "ADMIN"
