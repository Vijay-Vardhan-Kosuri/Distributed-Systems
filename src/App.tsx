import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Layers,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Cpu,
  BarChart3,
  Server,
  PlayCircle,
  FileText,
  AlertCircle,
} from 'lucide-react';
import {
  UserRole,
  TimeRangeFilter,
  SystemOverview,
  BackendServer,
  MetricDataPoint,
  AlgorithmTestResult,
  ServerEvent,
  AlgorithmType,
} from './types/loadsphere.ts';
import { apiClient } from './services/apiClient.ts';
import { Navbar } from './components/Navbar.tsx';
import { KpiCard } from './components/KpiCard.tsx';
import { ServerCard } from './components/ServerCard.tsx';
import { TrafficCharts } from './components/TrafficCharts.tsx';
import { AlgorithmComparisonView } from './components/AlgorithmComparisonView.tsx';
import { PerformanceTestingModule } from './components/PerformanceTestingModule.tsx';
import { ServerEventsHistory } from './components/ServerEventsHistory.tsx';
import {
  formatLatency,
  formatThroughput,
  formatPercentage,
  formatRequestCount,
  formatAlgorithmName,
} from './utils/metrics.ts';

export const App: React.FC = () => {
  // Navigation / View Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'algorithms' | 'testing' | 'events'>('overview');

  // Role management
  const [currentRole, setCurrentRole] = useState<UserRole>('operator');

  // Time range filter for traffic telemetry
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('15m');

  // Core State
  const [overview, setOverview] = useState<SystemOverview | null>(null);
  const [servers, setServers] = useState<BackendServer[]>([]);
  const [metricHistory, setMetricHistory] = useState<MetricDataPoint[]>([]);
  const [testResults, setTestResults] = useState<AlgorithmTestResult[]>([]);
  const [events, setEvents] = useState<ServerEvent[]>([]);

  // Loading & Error States
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isMockMode, setIsMockMode] = useState<boolean>(apiClient.isMockMode());

  // Role permissions
  const canManageAlgorithms = currentRole === 'admin' || currentRole === 'operator';
  const canExecuteTests = currentRole === 'admin' || currentRole === 'operator';
  const canManageServers = currentRole === 'admin';

  // Load telemetry data
  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    setApiError(null);

    try {
      const [ov, srvs, hist, res, evts] = await Promise.all([
        apiClient.getSystemOverview(),
        apiClient.getServers(),
        apiClient.getMetricHistory(timeRange),
        apiClient.getTestResults(),
        apiClient.getEvents(),
      ]);

      setOverview(ov);
      setServers(srvs);
      setMetricHistory(hist);
      setTestResults(res);
      setEvents(evts);
    } catch (err: any) {
      setApiError(`API Telemetry Error: ${err.message || 'Failed to fetch cluster state'}`);
    } finally {
      setIsRefreshing(false);
    }
  }, [timeRange]);

  // Periodic polling (every 5 seconds)
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Handle algorithm switch by operator or admin
  const handleAlgorithmChange = async (newAlgo: AlgorithmType) => {
    if (!canManageAlgorithms) {
      alert('Unauthorized: Performance Analysts have read-only access.');
      return;
    }
    try {
      await apiClient.setActiveAlgorithm(newAlgo);
      fetchData();
    } catch (err: any) {
      setApiError(err.message);
    }
  };

  // Failover simulation trigger
  const handleSimulateServer = async (serverId: string, status: 'healthy' | 'unhealthy' | 'degraded') => {
    try {
      await apiClient.simulateServerStatus(serverId, status);
      fetchData();
    } catch (err: any) {
      setApiError(err.message);
    }
  };

  const handleToggleMock = (enabled: boolean) => {
    apiClient.setMockMode(enabled);
    setIsMockMode(enabled);
    fetchData();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Navbar */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        lastUpdated={overview?.lastUpdated || null}
        onRefresh={fetchData}
        isRefreshing={isRefreshing}
        isMockMode={isMockMode}
        onToggleMockMode={handleToggleMock}
      />

      {/* Main Body */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 space-y-6">
        {/* Error Alert if API failed */}
        {apiError && (
          <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs text-rose-300">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
            <div>
              <p className="font-semibold text-rose-200">Observability API Notice</p>
              <p>{apiError}</p>
            </div>
          </div>
        )}

        {/* View Switcher Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`cursor-pointer flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Activity className="h-4 w-4" /> Main Cluster Dashboard
            </button>

            <button
              onClick={() => setActiveTab('algorithms')}
              className={`cursor-pointer flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                activeTab === 'algorithms'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="h-4 w-4" /> Algorithm Comparison
            </button>

            <button
              onClick={() => setActiveTab('testing')}
              className={`cursor-pointer flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                activeTab === 'testing'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <PlayCircle className="h-4 w-4" /> Performance Testing
            </button>

            <button
              onClick={() => setActiveTab('events')}
              className={`cursor-pointer flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                activeTab === 'events'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <FileText className="h-4 w-4" /> Incident History ({events.length})
            </button>
          </div>

          {/* Quick Algorithm Switcher for Operator/Admin */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Active Routing:</span>
            {canManageAlgorithms ? (
              <select
                value={overview?.activeAlgorithm || 'dynamic-load-balancing'}
                onChange={e => handleAlgorithmChange(e.target.value as AlgorithmType)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-cyan-300 outline-none cursor-pointer"
              >
                <option value="round-robin">Round Robin</option>
                <option value="least-connections">Least Connections</option>
                <option value="dynamic-load-balancing">Dynamic Load Balancing</option>
              </select>
            ) : (
              <span className="font-semibold text-cyan-400 font-mono">
                {overview ? formatAlgorithmName(overview.activeAlgorithm) : 'Loading...'}
              </span>
            )}
          </div>
        </div>

        {/* Tab 1: Main Cluster Dashboard */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                title="Total Requests Processed"
                value={formatRequestCount(overview?.totalRequests)}
                icon={Layers}
                description="Aggregated count across all 3 nodes"
                trend={{ value: 4.2, text: 'vs previous hour' }}
                statusVariant="default"
              />

              <KpiCard
                title="Requests Per Second"
                value={formatThroughput(overview?.requestsPerSecond)}
                icon={Zap}
                description="Instant aggregate throughput"
                trend={{ value: 2.1, text: 'traffic surge' }}
                statusVariant="info"
              />

              <KpiCard
                title="Avg Response Latency"
                value={formatLatency(overview?.avgResponseTimeMs)}
                icon={Clock}
                description="Mean roundtrip latency across cluster"
                trend={{ value: -5.4, isPositiveGood: false, text: 'faster' }}
                statusVariant="info"
              />

              <KpiCard
                title="P95 Response Latency"
                value={formatLatency(overview?.p95LatencyMs)}
                icon={Clock}
                description="95th percentile tail latency"
                statusVariant={overview && overview.p95LatencyMs > 40 ? 'warning' : 'default'}
              />

              <KpiCard
                title="Cluster Error Rate"
                value={formatPercentage(overview?.errorRate)}
                icon={AlertTriangle}
                description="Failed requests / total completed"
                statusVariant={overview && overview.errorRate > 1.0 ? 'danger' : 'success'}
              />

              <KpiCard
                title="Healthy Backends"
                value={`${overview?.healthyServersCount || 0} / ${overview?.totalServersCount || 3}`}
                icon={ShieldCheck}
                description="Active nodes handling live traffic"
                statusVariant="success"
              />

              <KpiCard
                title="Unhealthy / Recovering"
                value={`${(overview?.unhealthyServersCount || 0) + (overview?.degradedServersCount || 0)}`}
                icon={AlertTriangle}
                description="Nodes quarantined or in warm-up"
                statusVariant={
                  (overview?.unhealthyServersCount || 0) > 0 ? 'danger' : 'default'
                }
              />

              <KpiCard
                title="Routing Algorithm"
                value={overview ? formatAlgorithmName(overview.activeAlgorithm) : 'Loading...'}
                icon={Activity}
                description="Active load distribution policy"
                statusVariant="info"
              />
            </div>

            {/* Live Traffic Telemetry Charts */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Activity className="h-4 w-4 text-cyan-400" />
                  Cluster Request Traffic & Latency Visualizations
                </h3>
              </div>
              <TrafficCharts
                data={metricHistory}
                timeRange={timeRange}
                onTimeRangeChange={setTimeRange}
                isLoading={isRefreshing && metricHistory.length === 0}
              />
            </div>

            {/* 3 Backend Servers Status Panel */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Server className="h-4 w-4 text-indigo-400" />
                  Backend Server Fleet Status (3 Nodes)
                </h3>
                {canManageServers && (
                  <span className="text-[11px] text-purple-400 font-mono">
                    Admin Privileges: Outage/Recovery injection enabled
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {servers.map(server => (
                  <ServerCard
                    key={server.id}
                    server={server}
                    canManageServer={canManageServers}
                    onSimulateStatus={handleSimulateServer}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Algorithm Comparison */}
        {activeTab === 'algorithms' && (
          <AlgorithmComparisonView results={testResults} />
        )}

        {/* Tab 3: Performance Testing */}
        {activeTab === 'testing' && (
          <PerformanceTestingModule
            canExecuteTests={canExecuteTests}
            onTestCompleted={res => {
              setTestResults(prev => [res, ...prev]);
              setActiveTab('algorithms');
            }}
          />
        )}

        {/* Tab 4: Incidents & Failover Events */}
        {activeTab === 'events' && (
          <ServerEventsHistory events={events} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-4 text-center text-xs text-slate-500">
        LoadSphere Distributed Observability • Role: Dashboard & Performance Engineer • GitHub: New-domain
      </footer>
    </div>
  );
};

export default App;
