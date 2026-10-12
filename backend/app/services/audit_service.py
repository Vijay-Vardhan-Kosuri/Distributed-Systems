"""
Administrative Audit Trail Service
Records configuration updates, maintenance actions, and experiment launches.
"""

from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.models.base import AuditLog

class AuditService:
    @staticmethod
    def record_action(
        db: Session,
        username: str,
        role: str,
        action: str,
        target_type: str,
        target_id: str = None,
        details: str = None,
        ip_address: str = "127.0.0.1"
    ):
        log = AuditLog(
            username=username,
            role=role,
            action=action,
            target_type=target_type,
            target_id=target_id,
            details=details,
            ip_address=ip_address,
            timestamp=datetime.utcnow()
        )
        db.add(log)
        db.commit()

audit_service = AuditService()
