import {
  BackendServer,
  MetricDataPoint,
  SystemOverview,
  AlgorithmType,
  ServerEvent,
  AlgorithmTestResult,
  TestConfiguration,
  UserProfile,
} from '../types/loadsphere.ts';
import {
  INITIAL_SERVERS,
  INITIAL_EVENTS,
  INITIAL_TEST_RESULTS,
  WORKLOAD_PRESETS,
  generateMetricHistory,
} from '../data/mockData.ts';

export interface ApiClientConfig {
  baseUrl: string;
  useMock: boolean;
  timeoutMs: number;
}

class LoadSphereApiClient {
  private config: ApiClientConfig;
  private servers: BackendServer[] = [...INITIAL_SERVERS];
  private events: ServerEvent[] = [...INITIAL_EVENTS];
  private testResults: AlgorithmTestResult[] = [...INITIAL_TEST_RESULTS];
  private activeAlgorithm: AlgorithmType = 'dynamic-load-balancing';
  private activeRunningTest: {
    config: TestConfiguration;
    startTime: number;
    timer: any;
    intervalTimer: any;
  } | null = null;

  constructor() {
    // Default to mock mode when standalone, but check environment variables if available
    const envBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || '/api';
    const envUseMock = (import.meta as any).env?.VITE_USE_MOCK !== 'false';

    this.config = {
      baseUrl: envBaseUrl,
      useMock: envUseMock,
      timeoutMs: 5000,
    };
  }

  public isMockMode(): boolean {
    return this.config.useMock;
  }

  public setMockMode(enabled: boolean): void {
    this.config.useMock = enabled;
  }

  public getBaseUrl(): string {
    return this.config.baseUrl;
  }

  // --- 1. System Overview ---
  public async getSystemOverview(signal?: AbortSignal): Promise<SystemOverview> {
    if (!this.config.useMock) {
      const res = await fetch(`${this.config.baseUrl}/dashboard/overview`, { signal });
      if (!res.ok) throw new Error(`Failed to fetch overview: ${res.statusText}`);
      return res.json();
    }

    // Mock implementation using local state
    const healthyCount = this.servers.filter(s => s.status === 'healthy').length;
    const unhealthyCount = this.servers.filter(s => s.status === 'unhealthy').length;
    const degradedCount = this.servers.filter(s => s.status === 'degraded' || s.status === 'recovering').length;
    
    const totalReq = this.servers.reduce((sum, s) => sum + s.requestCount, 0);
    const avgRps = Number(this.servers.reduce((sum, s) => sum + s.throughputRps, 0).toFixed(1));
    const healthyServers = this.servers.filter(s => s.status === 'healthy');
    const avgLat = healthyServers.length > 0 
      ? Number((healthyServers.reduce((sum, s) => sum + s.avgResponseTimeMs, 0) / healthyServers.length).toFixed(1))
      : 0;

    return {
      totalRequests: totalReq,
      requestsPerSecond: avgRps,
      avgResponseTimeMs: avgLat,
      p95LatencyMs: Number((avgLat * 1.8).toFixed(1)),
      errorRate: 0.03,
      healthyServersCount: healthyCount,
      unhealthyServersCount: unhealthyCount,
      degradedServersCount: degradedCount,
      totalServersCount: this.servers.length,
      activeAlgorithm: this.activeAlgorithm,
      lastUpdated: new Date().toISOString(),
    };
  }

  // --- 2. Backend Servers ---
  public async getServers(signal?: AbortSignal): Promise<BackendServer[]> {
    if (!this.config.useMock) {
      const res = await fetch(`${this.config.baseUrl}/servers`, { signal });
      if (!res.ok) throw new Error(`Failed to fetch servers: ${res.statusText}`);
      return res.json();
    }
    // Update last health check timestamp slightly in mock mode
    return this.servers.map(s => ({
      ...s,
      lastHealthCheck: new Date().toISOString(),
    }));
  }

  // Admin/Operator simulation trigger: simulate backend fault or recovery for demonstration
  public async simulateServerStatus(serverId: string, status: 'healthy' | 'unhealthy' | 'degraded'): Promise<BackendServer> {
    const srv = this.servers.find(s => s.id === serverId);
    if (!srv) throw new Error(`Server ${serverId} not found`);

    srv.status = status;
    if (status === 'unhealthy') {
      srv.lastFailureTime = new Date().toISOString();
      srv.throughputRps = 0;
      srv.activeConnections = 0;
      this.events.unshift({
        id: `evt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        serverId: srv.id,
        serverName: srv.name,
        type: 'SERVER_MARKED_UNHEALTHY',
        severity: 'critical',
        message: `${srv.name} failed health probe and was marked UNHEALTHY`,
      });
      this.events.unshift({
        id: `evt-${Date.now() + 1}`,
        timestamp: new Date().toISOString(),
        serverId: srv.id,
        serverName: srv.name,
        type: 'TRAFFIC_REMOVED',
        severity: 'critical',
        message: `Traffic completely removed from ${srv.name}`,
      });
    } else if (status === 'healthy') {
      srv.lastRecoveryTime = new Date().toISOString();
      srv.throughputRps = 140;
      srv.activeConnections = 30;
      this.events.unshift({
        id: `evt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        serverId: srv.id,
        serverName: srv.name,
        type: 'SERVER_REJOINED_POOL',
        severity: 'recovery',
        message: `${srv.name} passed verification checks and rejoined active pool`,
      });
    }
    return { ...srv };
  }

  // --- 3. Historical Metrics ---
  public async getMetricHistory(timeRange: '5m' | '15m' | '1h' | '24h', signal?: AbortSignal): Promise<MetricDataPoint[]> {
    if (!this.config.useMock) {
      const res = await fetch(`${this.config.baseUrl}/metrics/history?range=${timeRange}`, { signal });
      if (!res.ok) throw new Error(`Failed to fetch history: ${res.statusText}`);
      return res.json();
    }

    const pointsCount = timeRange === '5m' ? 15 : timeRange === '15m' ? 30 : timeRange === '1h' ? 60 : 100;
    return generateMetricHistory(pointsCount);
  }

  // --- 4. Algorithms ---
  public async getActiveAlgorithm(signal?: AbortSignal): Promise<{ algorithm: AlgorithmType }> {
    if (!this.config.useMock) {
      const res = await fetch(`${this.config.baseUrl}/algorithms/active`, { signal });
      if (!res.ok) throw new Error(`Failed to fetch active algorithm: ${res.statusText}`);
      return res.json();
    }
    return { algorithm: this.activeAlgorithm };
  }

  public async setActiveAlgorithm(algorithm: AlgorithmType): Promise<{ success: boolean; algorithm: AlgorithmType }> {
    if (!this.config.useMock) {
      const res = await fetch(`${this.config.baseUrl}/algorithms/active`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ algorithm }),
      });
      if (!res.ok) throw new Error(`Failed to update algorithm: ${res.statusText}`);
      return res.json();
    }

    const prev = this.activeAlgorithm;
    this.activeAlgorithm = algorithm;
    this.events.unshift({
      id: `evt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'ALGORITHM_CHANGED',
      severity: 'info',
      message: `Load balancing routing policy changed to ${algorithm}`,
      details: { previous: prev, new: algorithm },
    });
    return { success: true, algorithm };
  }

  // --- 5. Performance Testing ---
  public async getTestResults(signal?: AbortSignal): Promise<AlgorithmTestResult[]> {
    if (!this.config.useMock) {
      const res = await fetch(`${this.config.baseUrl}/tests/results`, { signal });
      if (!res.ok) throw new Error(`Failed to fetch test results: ${res.statusText}`);
      return res.json();
    }
    return [...this.testResults];
  }

  public async startPerformanceTest(
    config: TestConfiguration,
    onProgress?: (progressPercent: number, currentMetrics: { rps: number; latency: number }) => void
  ): Promise<{ testId: string; status: string }> {
    if (!this.config.useMock) {
      const res = await fetch(`${this.config.baseUrl}/tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error(`Failed to start test: ${res.statusText}`);
      return res.json();
    }

    const testId = `test-${Date.now()}`;
    const startTime = Date.now();

    this.events.unshift({
      id: `evt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'PERFORMANCE_TEST_STARTED',
      severity: 'info',
      message: `Performance test "${config.name}" started with target ${config.targetRateRps} RPS`,
      details: { algorithm: config.algorithm, duration: config.durationSeconds },
    });

    return { testId, status: 'running' };
  }

  public async stopPerformanceTest(testId: string): Promise<{ success: boolean }> {
    if (!this.config.useMock) {
      const res = await fetch(`${this.config.baseUrl}/tests/${testId}/stop`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error(`Failed to stop test: ${res.statusText}`);
      return res.json();
    }

    this.events.unshift({
      id: `evt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'PERFORMANCE_TEST_STOPPED',
      severity: 'warning',
      message: `Performance test ${testId} was stopped by operator`,
    });
    return { success: true };
  }

  public addCompletedTestResult(result: AlgorithmTestResult): void {
    this.testResults.unshift(result);
    this.events.unshift({
      id: `evt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'PERFORMANCE_TEST_COMPLETED',
      severity: 'info',
      message: `Performance test "${result.testName}" completed. Avg latency: ${result.avgLatencyMs}ms, Throughput: ${result.throughputRps} RPS`,
      details: { algorithm: result.algorithm, totalRequests: result.totalRequests },
    });
  }

  // --- 6. Incident Events ---
  public async getEvents(signal?: AbortSignal): Promise<ServerEvent[]> {
    if (!this.config.useMock) {
      const res = await fetch(`${this.config.baseUrl}/events`, { signal });
      if (!res.ok) throw new Error(`Failed to fetch events: ${res.statusText}`);
      return res.json();
    }
    return [...this.events];
  }
}

export const apiClient = new LoadSphereApiClient();
