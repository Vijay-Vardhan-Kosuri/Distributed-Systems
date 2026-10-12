// Core Data Models for LoadSphere Distributed Systems Observability

export type AlgorithmType = 'round-robin' | 'least-connections' | 'dynamic-load-balancing';

export type ServerHealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'recovering' | 'unknown';

export type UserRole = 'admin' | 'operator' | 'analyst';

export type TimeRangeFilter = '5m' | '15m' | '1h' | '24h';

export interface BackendServer {
  id: string; // e.g. "srv-1"
  name: string; // e.g. "Server 1"
  address: string; // e.g. "http://10.0.1.101:8081"
  status: ServerHealthStatus;
  availability: number; // percentage (0 - 100), based on monitored successful checks
  requestCount: number;
  activeConnections: number | null; // null if not reported by genuine backend
  avgResponseTimeMs: number;
  throughputRps: number;
  errorCount: number;
  errorRate: number; // percentage (0 - 100)
  cpuUsagePercent: number | null; // null if genuine monitor not installed
  memoryUsagePercent: number | null;
  lastHealthCheck: string; // ISO 8601 string
  lastFailureTime: string | null;
  lastRecoveryTime: string | null;
}

export interface MetricDataPoint {
  timestamp: string; // ISO 8601
  formattedTime: string; // HH:mm:ss
  requestsPerSecond: number;
  successfulRequests: number;
  failedRequests: number;
  errorRate: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  server1Requests: number;
  server2Requests: number;
  server3Requests: number;
  algorithm: AlgorithmType;
}

export interface SystemOverview {
  totalRequests: number;
  requestsPerSecond: number;
  avgResponseTimeMs: number;
  p95LatencyMs: number;
  errorRate: number; // percentage
  healthyServersCount: number;
  unhealthyServersCount: number;
  degradedServersCount: number;
  totalServersCount: number;
  activeAlgorithm: AlgorithmType;
  lastUpdated: string;
}

export type EventSeverity = 'info' | 'warning' | 'critical' | 'recovery';

export type EventType =
  | 'HEALTH_CHECK_FAILED'
  | 'SERVER_MARKED_UNHEALTHY'
  | 'TRAFFIC_REMOVED'
  | 'SERVER_RECOVERY_DETECTED'
  | 'RECOVERY_VALIDATION_COMPLETED'
  | 'SERVER_REJOINED_POOL'
  | 'ALGORITHM_CHANGED'
  | 'PERFORMANCE_TEST_STARTED'
  | 'PERFORMANCE_TEST_COMPLETED'
  | 'PERFORMANCE_TEST_STOPPED';

export interface ServerEvent {
  id: string;
  timestamp: string;
  serverId?: string;
  serverName?: string;
  type: EventType;
  severity: EventSeverity;
  message: string;
  details?: Record<string, string | number | boolean>;
}

export type TestStatus = 'idle' | 'configuring' | 'running' | 'completed' | 'stopped' | 'failed';

export interface WorkloadPreset {
  id: string;
  name: string;
  description: string;
  targetRateRps: number;
  virtualUsers: number;
  durationSeconds: number;
  rampUpSeconds: number;
  endpoint: string;
}

export interface TestConfiguration {
  id?: string;
  name: string;
  algorithm: AlgorithmType;
  targetRateRps: number;
  virtualUsers: number;
  durationSeconds: number;
  rampUpSeconds: number;
  endpoint: string;
  method: 'GET' | 'POST';
}

export interface AlgorithmTestResult {
  testId: string;
  testName: string;
  algorithm: AlgorithmType;
  workloadName: string;
  timestamp: string;
  durationSeconds: number;
  totalRequests: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  throughputRps: number;
  errorRate: number;
  serverDistribution: {
    serverId: string;
    serverName: string;
    requestCount: number;
    percentage: number;
    activeConnections: number | null;
    avgLatencyMs: number;
  }[];
  healthyBackendsCount: number;
  totalBackendsCount: number;
  workloadConfig: {
    targetRateRps: number;
    virtualUsers: number;
    durationSeconds: number;
    endpoint: string;
  };
}

export interface UserProfile {
  id: string;
  username: string;
  role: UserRole;
  token?: string;
}
