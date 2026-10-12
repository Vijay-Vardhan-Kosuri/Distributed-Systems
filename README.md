# LoadSphere — Dashboard & Performance Engineering Module


---

## 1. System Overview

LoadSphere is a distributed load-balancing system designed to route incoming network requests across three backend servers using **Round Robin**, **Least Connections**, and **Dynamic Load Balancing**.

This module delivers the **production-grade Observability, Telemetry, and Performance Analysis Dashboard**, strictly architected according to distributed systems principles:
- **Authoritative Backend Ingestion:** Does not fabricate synthetic health or status flags; maintains explicit distinctions between `0` (an empirical measurement) and `Unavailable` / `null` (missing metric).
- **Graceful Fault Tolerance:** Handles division by zero, missing observations, connection timeouts, and backend outages without application crashes.
- **Failover & Re-entry Observability:** Reflects backend server health check failures, traffic isolation, warm-up probe validation, and safe re-entry into the routing pool.
- **Role-Based Experience:** Enforces boundaries across **Administrator**, **Load Balancing Operator**, and **Performance Analyst** roles.
- **Independent Mock Adapter & Live API Layer:** Provides isolated, typed API services (`apiClient.ts`) capable of switching seamlessly between the integrated backend service and deterministic local development fixtures.

---

## 2. Architecture & Directory Structure

```
loadsphere-dashboard/
├── src/
│   ├── components/
│   │   ├── Navbar.tsx                   # Cluster branding, role switcher, refresh, mock/live toggle
│   │   ├── KpiCard.tsx                  # High-density distributed systems metric KPI cards
│   │   ├── ServerCard.tsx               # 3 Backend nodes health, latency, connections, failover status
│   │   ├── TrafficCharts.tsx            # Multi-series Recharts: RPS, Latency (P50/P95/P99), Distribution, Errors
│   │   ├── AlgorithmComparisonView.tsx  # Objective 3-algorithm comparison & empirical winner evaluation
│   │   ├── PerformanceTestingModule.tsx # Load testing runner: presets, VUs, duration, RPS, live progress
│   │   └── ServerEventsHistory.tsx      # Authoritative failover, traffic shedding, recovery timeline
│   ├── data/
│   │   └── mockData.ts                  # Isolated fallback fixtures & telemetry generators
│   ├── services/
│   │   └── apiClient.ts                 # Typed API client layer for backend endpoints
│   ├── types/
│   │   └── loadsphere.ts                # TypeScript domain models (Server, Metric, TestResult, Event, Role)
│   ├── utils/
│   │   ├── metrics.ts                   # Pure statistical calculations: error rates, throughput, percentiles
│   │   ├── metrics.test.ts              # Unit tests for calculations and division-by-zero handling
│   │   └── exporter.ts                  # CSV export utilities for metrics, benchmarks, and incidents
│   ├── test/
│   │   ├── setup.ts                     # Testing-library / vitest environment setup
│   │   └── components.test.tsx          # Component tests for cards and role-based actions
│   ├── App.tsx                          # Core application shell & periodic polling orchestrator
│   ├── index.css                        # Tailwind CSS styles
│   └── main.tsx                         # React 19 application entry point
├── package.json
├── vite.config.ts
└── README.md
```

---

## 3. Implemented Capabilities

### A. Main Observability Dashboard
- **8 KPI Metrics:** Total Requests Processed, Requests per Second (RPS), Average Response Time, P95 Tail Latency, Cluster Error Rate, Healthy Nodes, Unhealthy/Quarantined Nodes, and Current Active Algorithm.
- **Interactive Time-Series Visualizations:**
  - Requests Per Second over time (Area chart).
  - P50, P95, and P99 Tail Latency over time (Multi-line chart).
  - Per-server traffic distribution across Server 1, Server 2, and Server 3.
  - Successful vs. failed request volume (Bar chart).
  - Time-range filters: `5m`, `15m`, `1h`, `24h` with real data updates.

### B. 3 Backend Servers Status Panel
- Tracks **Server 1**, **Server 2**, and **Server 3** with distinct network addresses.
- Displays current health (`healthy`, `degraded`, `unhealthy`, `recovering`, `unknown`), availability percentage, request count, active connections, response latency, throughput, error rate, CPU/Memory stats, and last health check timestamp.
- Outage alert clearly indicates when traffic is completely diverted away from an unhealthy node.

### C. Algorithm Performance & Comparison
- Evaluates **Round Robin**, **Least Connections**, and **Dynamic Load Balancing**.
- Objective Winner Summary evaluates:
  - Lowest Latency.
  - Highest Throughput.
  - Lowest Error Rate.
  - Most Balanced Traffic Distribution (measured via deviation score from equal 33.3% load).
- Does not assume Dynamic Load Balancing always wins; conclusions are computed directly from benchmark test datasets.
- Includes a clear scientific principle reminder that benchmarks are comparable only under consistent workloads and environments.

### D. Performance Testing Module
- Workload Presets: Light Load (100 RPS), Normal Load (500 RPS), Heavy Load (1,500 RPS), Stress Test (3,000 RPS).
- Custom configuration: Target RPS (10 - 5,000), Virtual Users (1 - 500), Duration (5 - 300s), Ramp-up, and restricted internal endpoints.
- Live progress indicator with elapsed time, instant RPS, live latency, and early stop controls.
- Completed runs automatically append to benchmark datasets and event logs.

### E. Server Failover & Incident History
- Authoritative timeline displaying event severity (`critical`, `warning`, `recovery`, `info`).
- Captures probe timeouts, node quarantine, traffic routing diversion, warm-up heartbeat detection, and active pool re-entry.
- Search and severity filtering with one-click CSV export.

### F. Role-Based Permissions
- **Administrator:** Full visibility, algorithm routing changes, load testing execution, and backend failover injection for testing resilience.
- **Load Balancing Operator:** Full monitoring, algorithm selection, and load test execution/stopping.
- **Performance Analyst:** Read-only access to all dashboards, algorithm comparisons, and data exports; mutating controls and test execution are disabled.

---

## 4. Proposed Backend API Contracts

Documented contract for integration with team members building the Go/Node/Python load balancer and backend servers:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/dashboard/overview` | `GET` | Cluster aggregated KPIs, active algorithm, node counts |
| `/api/servers` | `GET` | Status, availability, connections, and latency for all 3 nodes |
| `/api/servers/:id/metrics` | `GET` | Historical metrics for an individual backend server |
| `/api/metrics/history?range={5m\|15m\|1h\|24h}` | `GET` | Aggregated cluster telemetry data points |
| `/api/algorithms/active` | `GET` | Get current active routing policy |
| `/api/algorithms/active` | `PUT` | Update active algorithm (`{ algorithm: "dynamic-load-balancing" }`) |
| `/api/tests` | `POST` | Launch an authorized performance load test |
| `/api/tests/:id/stop` | `POST` | Abort a running performance test |
| `/api/tests/results` | `GET` | Retrieve completed benchmark runs |
| `/api/events` | `GET` | Retrieve server failover and incident history |

---

## 5. Local Setup and Execution

### Prerequisites
- Node.js v18+ (tested on Node v22)
- npm v9+

### Commands
```bash
# 1. Install dependencies
npm install

# 2. Run unit and component test suites (Vitest)
npx vitest run

# 3. Run production build and type checking
npm run build

# 4. Start local development server
npm run dev
```

---

## 6. Verification Results

- **Unit Tests:** 20 / 20 tests passing (metric calculation edge cases, division-by-zero safety, statistical winners evaluation, component rendering, role permissions).
- **TypeScript Check (`tsc -b`):** 0 errors.
- **Production Bundle:** Successfully compiled via Vite.
