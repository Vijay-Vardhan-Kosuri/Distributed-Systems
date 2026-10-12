"""
Aggregated Metrics and Real-Time Telemetry Service
Calculates Average Latency, P95 Latency, Throughput RPS, and Coefficient of Variation.
"""

import math
from typing import Dict, Any, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.app.models.base import BackendServer, RequestLog, MetricSnapshot
from backend.app.load_balancer.balancer import lb_coordinator

class MetricsService:
    @staticmethod
    def calculate_imbalance_cv(counts: List[int]) -> float:
        """
        Calculates Coefficient of Variation: CV = std_dev / mean.
        Measures traffic distribution imbalance.
        Zero requests or single server returns 0.0.
        """
        if not counts or sum(counts) == 0:
            return 0.0
        n = len(counts)
        mean = sum(counts) / float(n)
        if mean == 0.0:
            return 0.0
        variance = sum((x - mean) ** 2 for x in counts) / float(n)
        std_dev = math.sqrt(variance)
        return round(std_dev / mean, 4)

    @staticmethod
    def get_kpi_summary(db: Session) -> Dict[str, Any]:
        """Calculates live KPI metrics for dashboard."""
        servers = db.query(BackendServer).all()
        total_servers = len(servers)
        healthy_servers = sum(1 for s in servers if s.is_healthy and s.is_enabled)
        
        # System status pill
        if healthy_servers == total_servers and total_servers > 0:
            system_status = "OPERATIONAL"
        elif healthy_servers > 0:
            system_status = "DEGRADED"
        else:
            system_status = "CRITICAL"

        # Recent requests window (last 5 minutes)
        five_mins_ago = datetime.utcnow() - timedelta(minutes=5)
        recent_reqs = db.query(RequestLog).filter(RequestLog.timestamp >= five_mins_ago).all()
        
        total_reqs = len(recent_reqs)
        if total_reqs == 0:
            # Fall back to all-time totals
            total_reqs = db.query(RequestLog).count()
            recent_reqs = db.query(RequestLog).order_by(RequestLog.id.desc()).limit(200).all()

        successful = sum(1 for r in recent_reqs if 200 <= r.response_status < 400)
        failed = sum(1 for r in recent_reqs if r.response_status >= 400 or r.response_status < 200)
        error_rate = round((failed / float(len(recent_reqs))) * 100.0, 2) if recent_reqs else 0.0

        # Latencies
        latencies = [r.duration_ms for r in recent_reqs if r.duration_ms is not None]
        if latencies:
            latencies.sort()
            avg_lat = round(sum(latencies) / len(latencies), 2)
            p95_idx = int(0.95 * len(latencies))
            p95_lat = round(latencies[min(p95_idx, len(latencies) - 1)], 2)
        else:
            avg_lat = 0.0
            p95_lat = 0.0

        # Active connections across cluster
        active_requests = sum(s.active_connections for s in servers)
        
        # Throughput (approx requests per second in last 60 seconds)
        one_min_ago = datetime.utcnow() - timedelta(seconds=60)
        reqs_last_min = db.query(RequestLog).filter(RequestLog.timestamp >= one_min_ago).count()
        throughput_rps = round(reqs_last_min / 60.0, 2)
        if throughput_rps == 0.0 and total_reqs > 0:
            throughput_rps = round(total_reqs / 120.0, 2) # normalized baseline

        # Server distribution counts
        server_dist = {}
        for s in servers:
            count = sum(1 for r in recent_reqs if r.selected_server_id == s.id)
            server_dist[s.name] = count

        cv = MetricsService.calculate_imbalance_cv(list(server_dist.values()))

        return {
            "total_requests": total_reqs,
            "successful_requests": successful,
            "failed_requests": failed,
            "active_requests": active_requests,
            "avg_latency_ms": avg_lat,
            "p95_latency_ms": p95_lat,
            "throughput_rps": throughput_rps,
            "error_rate": error_rate,
            "healthy_servers_count": healthy_servers,
            "total_servers_count": total_servers,
            "active_algorithm": lb_coordinator.get_algorithm(),
            "load_imbalance_cv": cv,
            "server_distribution": server_dist,
            "system_status": system_status
        }

metrics_service = MetricsService()
