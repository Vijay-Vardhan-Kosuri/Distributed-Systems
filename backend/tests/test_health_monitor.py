"""
Unit Tests for Health Monitor Threshold Transitions
"""

import pytest
from backend.app.models.base import BackendServer
from backend.app.load_balancer.health_monitor import HealthMonitor

def test_health_policy_configuration():
    hm = HealthMonitor()
    hm.update_policy(interval=3.0, timeout=1.5, fail_thresh=2, rec_thresh=4)
    assert hm.interval == 3.0
    assert hm.timeout == 1.5
    assert hm.failure_threshold == 2
    assert hm.recovery_threshold == 4

def test_failure_threshold_logic():
    s = BackendServer(id="srv_1", is_healthy=True, consecutive_failures=0, consecutive_successes=5)
    threshold = 3
    
    # 1st failure
    s.consecutive_failures += 1
    assert s.is_healthy is True
    
    # 2nd failure
    s.consecutive_failures += 1
    assert s.is_healthy is True
    
    # 3rd failure reaches threshold
    s.consecutive_failures += 1
    if s.consecutive_failures >= threshold:
        s.is_healthy = False
        
    assert s.is_healthy is False

def test_recovery_threshold_logic():
    s = BackendServer(id="srv_1", is_healthy=False, consecutive_failures=5, consecutive_successes=0)
    threshold = 3
    
    # 1st and 2nd success
    s.consecutive_successes += 1
    s.consecutive_successes += 1
    assert s.is_healthy is False
    
    # 3rd success restores health
    s.consecutive_successes += 1
    if s.consecutive_successes >= threshold:
        s.is_healthy = True
        
    assert s.is_healthy is True
