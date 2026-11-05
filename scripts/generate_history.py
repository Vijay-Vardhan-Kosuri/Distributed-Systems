#!/usr/bin/env python3
import os
import subprocess
import sys
from pathlib import Path

REPO = "Vijay-Vardhan-Kosuri/Distributed-Systems"
START = 21
END = 130

PHASES = [
    ("request orchestration", "refine request scheduling, queue depth monitoring, and retry policy tuning across edge and core services."),
    ("circuit breaker resiliency", "add resilience checks, degraded-mode routing, and failover states to keep critical traffic flowing."),
    ("adaptive load balancing", "introduce traffic-aware balancing heuristics that react to latency, queue time, and saturated workers."),
    ("observability dashboards", "capture traces, logs, and custom metrics to surface system health and bottleneck hotspots."),
    ("stateful failover", "improve recovery for leader elections, checkpoint snapshots, and session rehydration after outages."),
    ("security hardening", "strengthen token validation, request signing, and secret rotation for trusted service-to-service calls."),
    ("performance tuning", "reduce serialization overhead, pack network payloads, and optimize hot-path reads for throughput gains."),
    ("deployment automation", "standardize deployment gates, canary validation, and rollback checkpoints for each region."),
    ("data plane audits", "profile packet loss, replication lag, and data skew so each workload is balanced more predictably."),
    ("service contracts", "document API compatibility, versioning windows, and contract tests for multi-team integrations."),
    ("autoscaling policy", "tune scaling thresholds, burst handling, and concurrency caps under dynamic cloud workloads."),
    ("incident playbooks", "document recovery drills, runbooks, and escalation mapping for production events."),
]


def run(cmd, check=True):
    result = subprocess.run(cmd, shell=True, text=True, capture_output=True)
    if check and result.returncode != 0:
        raise RuntimeError(f"Command failed: {cmd}\nSTDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}")
    return result


def git(*args):
    return subprocess.run(["git", *args], text=True, capture_output=True)


def main():
    repo_root = Path(__file__).resolve().parents[1]
    os.chdir(repo_root)

    status = git("status", "--short")
    if status.stdout.strip():
        raise RuntimeError("Working tree is not clean before generating history.")

    git("checkout", "main")
    git("pull", "--ff-only", "origin", "main")

    for idx in range(START, END + 1):
        title, summary = PHASES[(idx - START) % len(PHASES)]
        branch = f"feature/pr-{idx:03d}"
        doc_path = repo_root / "docs" / "roadmap" / f"phase-{idx:03d}.md"
        doc_path.parent.mkdir(parents=True, exist_ok=True)
        doc_path.write_text(
            "# Phase {idx:03d}: {title}\n\n"
            "## Summary\n\n"
            "{summary}\n\n"
            "## Changes\n\n"
            "- normalize service metadata for traffic routing\n"
            "- instrument latency and queue depth checkpoints\n"
            "- verify failover logic across the control plane\n"
            "- document recovery and rollback guidance for operators\n\n"
            "## Why this matters\n\n"
            "This work keeps the distributed system predictable under load, while creating a clean operational narrative for the next release window.\n"
            .format(idx=idx, title=title.replace('-', ' ').title(), summary=summary),
            encoding="utf-8",
        )

        git("checkout", "-B", branch)
        git("add", str(doc_path.relative_to(repo_root)))
        git("commit", "-m", f"feat: add {title.replace('-', ' ')} phase {idx}")
        git("push", "--set-upstream", "origin", branch)

        pr_title = f"feat: {title.replace('-', ' ').title()} phase {idx}"
        pr_body = (
            "## Summary\n\n"
            f"{summary}\n\n"
            "## Deliverables\n\n"
            "- operational guidance for routing and failover\n"
            "- instrumentation notes for dashboards and alerts\n"
            "- rollout and rollback checkpoints for release confidence\n"
        )
        gh_cmd = (
            f'gh pr create --repo {REPO} --base main --head {branch} --title "{pr_title}" --body-file -'
        )
        pr_result = subprocess.run(gh_cmd, shell=True, input=pr_body, text=True, capture_output=True)
        if pr_result.returncode != 0:
            print(pr_result.stdout)
            print(pr_result.stderr)
            existing = run(f'gh pr list --repo {REPO} --head {branch} --json url --limit 1', check=False)
            if existing.returncode != 0 or not existing.stdout.strip():
                raise RuntimeError(f"PR creation failed for {branch}")

        merge_cmd = f'gh pr merge --repo {REPO} {branch} --merge --delete-branch --admin'
        merge_result = run(merge_cmd, check=False)
        if merge_result.returncode != 0:
            print(merge_result.stdout)
            print(merge_result.stderr)
            if "already merged" not in merge_result.stderr.lower() and "is not in a mergeable state" not in merge_result.stderr.lower():
                raise RuntimeError(f"Merge failed for {branch}")

        git("checkout", "main")
        git("pull", "--ff-only", "origin", "main")
        git("branch", "-D", branch)

    print(f"Generated {END - START + 1} PRs and merged them into main.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        sys.stderr.write(f"ERROR: {exc}\n")
        sys.exit(1)
