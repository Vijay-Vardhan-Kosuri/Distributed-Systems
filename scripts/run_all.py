"""
Multi-process Application Supervisor
Launches Server A (8001), Server B (8002), Server C (8003), and Load Balancer (8000) concurrently.
"""

import os
import sys
import subprocess
import time
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent

def main():
    print("=" * 70)
    print("Starting LoadSphere Enterprise Platform Cluster...")
    print("=" * 70)

    python_exe = sys.executable
    proc_env = os.environ.copy()
    proc_env["PYTHONPATH"] = str(BASE)

    procs = []
    try:
        # Start Server A
        print("[1/4] Starting Server A on port 8001...")
        p_a = subprocess.Popen([python_exe, str(BASE / "backend" / "servers" / "run_server_a.py")], cwd=str(BASE), env=proc_env)
        procs.append(p_a)

        # Start Server B
        print("[2/4] Starting Server B on port 8002...")
        p_b = subprocess.Popen([python_exe, str(BASE / "backend" / "servers" / "run_server_b.py")], cwd=str(BASE), env=proc_env)
        procs.append(p_b)

        # Start Server C
        print("[3/4] Starting Server C on port 8003...")
        p_c = subprocess.Popen([python_exe, str(BASE / "backend" / "servers" / "run_server_c.py")], cwd=str(BASE), env=proc_env)
        procs.append(p_c)

        time.sleep(2)

        # Start Load Balancer
        print("[4/4] Starting Load Balancer on port 8000...")
        p_lb = subprocess.Popen([python_exe, "-m", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"], cwd=str(BASE), env=proc_env)
        procs.append(p_lb)

        print("=" * 70)
        print("LoadSphere is UP and RUNNING!")
        print("Frontend Dashboard: http://localhost:8000")
        print("API Documentation:  http://localhost:8000/docs")
        print("Press Ctrl+C to terminate the cluster.")
        print("=" * 70)

        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        print("\nShutting down cluster processes...")
        for p in procs:
            p.terminate()
        for p in procs:
            p.wait()
        print("All processes terminated safely.")

if __name__ == "__main__":
    main()
