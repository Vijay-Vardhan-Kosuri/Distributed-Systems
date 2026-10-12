# Dashboard & Performance Engineer — Work Package

## Role Responsibility
Owns the **user interface**, observability, metrics, load testing, and performance reporting.

## What is included in this folder

### Frontend Dashboard (`frontend/`)
- `static/index.html` — Complete Single Page Application (Login + Dashboard)
- `static/css/styles.css` — Xurrent-inspired enterprise theme
- `static/js/app.js` — Main application logic, real-time updates
- `static/js/api.js` — API client
- `static/js/charts.js` — Chart rendering (latency, RPS, imbalance, etc.)
- `static/assets/` — Logo and static assets

### Performance Services
- `metrics_service.py` — Collects and aggregates performance metrics
- `test_runner.py` — Asynchronous workload generator / experiment runner

### API Endpoints
- `metrics.py` — Live metrics exposure
- `reports.py` — Operational / SLA reports
- `tests.py` — Trigger / manage load tests
- `experiments.py` — Algorithm benchmarking experiments

### Enterprise Modules
- `analytics/` — Analytics workers
- `telemetry/` — Telemetry collection workers
- `health_diagnostics/` — Health diagnostics workers

### Load Testing & Benchmarks
- `locust/locustfile.py` — Locust load testing scenarios
- `benchmarks/traces/` — Benchmark trace data

### Tests
- `test_metrics.py`

## Key Deliverables of this Role
1. Full interactive Enterprise Dashboard (login + real-time server cards + KPI cards)
2. Charts for latency (avg / P95), throughput, and load imbalance (CV)
3. Integrated load testing UI + Locust CLI suite
4. Experiment / benchmarking comparison matrix
5. Metrics collection service and reports generation
