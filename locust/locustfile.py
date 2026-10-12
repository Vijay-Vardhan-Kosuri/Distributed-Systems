"""
Locust Performance Workload Benchmark
Simulates concurrent user transactions against the LoadSphere Central Load Balancer.
"""

from locust import HttpUser, task, between

class LoadSphereUser(HttpUser):
    wait_time = between(0.1, 0.5)

    @task(3)
    def standard_http_transaction(self):
        """Simulates typical lightweight microservice transaction."""
        with self.client.get("/api/v1/proxy/api/process", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"HTTP {response.status_code}: {response.text}")

    @task(1)
    def compute_intensive_workload(self):
        """Simulates CPU bound workload."""
        with self.client.get("/api/v1/proxy/api/workload", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"HTTP {response.status_code}")
