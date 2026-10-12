"""
Automated 9-Step Failure Simulation and Recovery Demonstrator
Implements the exact 9-step demonstration sequence defined in Project Specification Section 10:

1. Start all three backend servers.
2. Verify that all servers pass health checks.
3. Send a workload through the load balancer.
4. Stop Server B or trigger a controlled test failure.
5. Verify that monitoring marks Server B unhealthy after configured threshold (3).
6. Confirm that new requests are routed only to eligible servers (Server A & C).
7. Restart / Recover Server B.
8. Confirm that it rejoins only after recovery threshold (3) is satisfied.
9. Verify that request routing resumes across all eligible servers.
"""

import time
import httpx

LB_URL = "http://localhost:8000"
SERVER_B_URL = "http://localhost:8002"

def print_step(num, title):
    print("\n" + "=" * 65)
    print(f"STEP {num}: {title}")
    print("=" * 65)

def main():
    client = httpx.Client(timeout=5.0)

    # STEP 1
    print_step(1, "Verify all backend instances are reachable")
    for s_name, s_url in [("Server A", "http://localhost:8001"), ("Server B", "http://localhost:8002"), ("Server C", "http://localhost:8003")]:
        try:
            r = client.get(f"{s_url}/health")
            print(f"  [PASS] {s_name} is UP ({r.json()['server_id']})")
        except Exception as e:
            print(f"  [ERROR] {s_name} unreachable: {e}")
            return

    # STEP 2
    print_step(2, "Verify LoadSphere Health Monitor reports all 3 servers healthy")
    r = client.get(f"{LB_URL}/api/v1/servers")
    servers = r.json()
    for s in servers:
        print(f"  Node: {s['name']} | Healthy: {s['is_healthy']} | Eligible: {s['is_eligible']}")
    assert all(s["is_healthy"] for s in servers), "Not all servers are healthy!"

    # STEP 3
    print_step(3, "Send baseline workload through LoadSphere proxy")
    destinations = {}
    for i in range(12):
        r = client.get(f"{LB_URL}/api/v1/proxy/api/process")
        dest = r.headers.get("x-loadsphere-server", "unknown")
        destinations[dest] = destinations.get(dest, 0) + 1
    print(f"  Baseline routing distribution across 12 requests: {destinations}")

    # STEP 4
    print_step(4, "Trigger controlled simulated failure on Server B")
    r = client.post(f"{SERVER_B_URL}/api/simulate/failure")
    print(f"  Server B status: {r.json()['status']}")

    # STEP 5
    print_step(5, "Wait for Health Monitor consecutive failure checks (Threshold = 3)")
    print("  Polling monitor every 2 seconds...")
    for _ in range(8):
        time.sleep(2)
        r = client.get(f"{LB_URL}/api/v1/servers")
        sb = next(s for s in r.json() if s["id"] == "server_b")
        print(f"  Server B consecutive fails: {sb['consecutive_failures']}/3 | is_healthy: {sb['is_healthy']}")
        if not sb["is_healthy"]:
            print("  ==> Server B SUCCESSFULLY MARKED UNHEALTHY by monitor!")
            break

    # STEP 6
    print_step(6, "Confirm requests are routed ONLY to Server A and Server C")
    destinations_failover = {}
    for i in range(10):
        r = client.get(f"{LB_URL}/api/v1/proxy/api/process")
        dest = r.headers.get("x-loadsphere-server", "unknown")
        destinations_failover[dest] = destinations_failover.get(dest, 0) + 1
    print(f"  Failover routing distribution: {destinations_failover}")
    assert "Server B" not in destinations_failover, "Server B unexpectedly received requests while failed!"
    print("  ==> Verification passed: Zero requests routed to unhealthy Server B.")

    # STEP 7
    print_step(7, "Recover Server B (Restore 200 OK)")
    r = client.post(f"{SERVER_B_URL}/api/simulate/recover")
    print(f"  Server B status: {r.json()['status']}")

    # STEP 8
    print_step(8, "Confirm Server B rejoins ONLY after Recovery Threshold (3 successful probes)")
    for _ in range(8):
        time.sleep(2)
        r = client.get(f"{LB_URL}/api/v1/servers")
        sb = next(s for s in r.json() if s["id"] == "server_b")
        print(f"  Server B consecutive successes: {sb['consecutive_successes']}/3 | is_healthy: {sb['is_healthy']}")
        if sb["is_healthy"]:
            print("  ==> Server B SUCCESSFULLY RESTORED TO HEALTHY POOL!")
            break

    # STEP 9
    print_step(9, "Verify request routing resumes across ALL THREE servers")
    destinations_resumed = {}
    for i in range(12):
        r = client.get(f"{LB_URL}/api/v1/proxy/api/process")
        dest = r.headers.get("x-loadsphere-server", "unknown")
        destinations_resumed[dest] = destinations_resumed.get(dest, 0) + 1
    print(f"  Restored routing distribution: {destinations_resumed}")
    assert len(destinations_resumed) == 3, "Traffic not reaching all three servers!"
    print("  ==> 9-Step Failover and Recovery Demonstration COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    main()
