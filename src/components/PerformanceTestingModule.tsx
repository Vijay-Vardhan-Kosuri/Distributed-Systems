import React, { useState } from 'react';
import {
  Play,
  Square,
  AlertCircle,
  Sliders,
  CheckCircle2,
  Clock,
  Layers,
  Activity,
} from 'lucide-react';
import {
  AlgorithmType,
  TestConfiguration,
  WorkloadPreset,
  AlgorithmTestResult,
} from '../types/loadsphere.ts';
import { WORKLOAD_PRESETS } from '../data/mockData.ts';
import { apiClient } from '../services/apiClient.ts';

interface PerformanceTestingModuleProps {
  canExecuteTests: boolean;
  onTestCompleted: (result: AlgorithmTestResult) => void;
}

export const PerformanceTestingModule: React.FC<PerformanceTestingModuleProps> = ({
  canExecuteTests,
  onTestCompleted,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('preset-normal');
  const [algorithm, setAlgorithm] = useState<AlgorithmType>('round-robin');
  const [targetRateRps, setTargetRateRps] = useState<number>(500);
  const [virtualUsers, setVirtualUsers] = useState<number>(50);
  const [durationSeconds, setDurationSeconds] = useState<number>(30);
  const [rampUpSeconds, setRampUpSeconds] = useState<number>(5);
  const [endpoint, setEndpoint] = useState<string>('/api/v1/workload/compute');

  // Test execution state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [liveRps, setLiveRps] = useState<number>(0);
  const [liveLatency, setLiveLatency] = useState<number>(0);
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  const handlePresetSelect = (preset: WorkloadPreset) => {
    setSelectedPresetId(preset.id);
    setTargetRateRps(preset.targetRateRps);
    setVirtualUsers(preset.virtualUsers);
    setDurationSeconds(preset.durationSeconds);
    setRampUpSeconds(preset.rampUpSeconds);
    setEndpoint(preset.endpoint);
  };

  const handleStartTest = async () => {
    if (!canExecuteTests) {
      setExecutionError('Unauthorized: Operator or Admin role required to execute load tests.');
      return;
    }

    setExecutionError(null);
    setIsRunning(true);
    setProgressPercent(0);
    setElapsedSeconds(0);
    setLiveRps(0);
    setLiveLatency(0);

    const config: TestConfiguration = {
      name: `${algorithm.toUpperCase()} Load Test (${targetRateRps} RPS)`,
      algorithm,
      targetRateRps,
      virtualUsers,
      durationSeconds,
      rampUpSeconds,
      endpoint,
      method: 'GET',
    };

    try {
      const { testId } = await apiClient.startPerformanceTest(config);
      setCurrentTestId(testId);

      // Simulation loop for realistic progress updates
      let elapsed = 0;
      const interval = setInterval(() => {
        elapsed += 1;
        setElapsedSeconds(elapsed);
        const pct = Math.min(100, Math.round((elapsed / durationSeconds) * 100));
        setProgressPercent(pct);

        // Realistic live telemetry during run
        const simulatedRps = Math.round(targetRateRps * (0.95 + Math.random() * 0.1));
        const baseLat = algorithm === 'dynamic-load-balancing' ? 16 : algorithm === 'least-connections' ? 20 : 25;
        const simulatedLat = Number((baseLat + Math.random() * 5).toFixed(1));

        setLiveRps(simulatedRps);
        setLiveLatency(simulatedLat);

        if (elapsed >= durationSeconds) {
          clearInterval(interval);
          finishTest(testId, config);
        }
      }, 1000);

      // Store interval handle in state-ref equivalent via window if needed
      (window as any).__loadSphereTestInterval = interval;
    } catch (err: any) {
      setIsRunning(false);
      setExecutionError(err.message || 'Failed to initialize load test.');
    }
  };

  const finishTest = (testId: string, config: TestConfiguration) => {
    setIsRunning(false);
    setProgressPercent(100);

    // Calculate completed benchmark data based on algorithm
    const totalRequests = config.targetRateRps * config.durationSeconds;
    const baseLat = config.algorithm === 'dynamic-load-balancing' ? 16.5 : config.algorithm === 'least-connections' ? 19.8 : 24.0;
    const avgLat = Number((baseLat + Math.random() * 1.5).toFixed(1));
    const p95 = Number((avgLat * 1.8).toFixed(1));
    const p99 = Number((avgLat * 2.5).toFixed(1));

    // Server distribution simulation: Round Robin splits evenly (33/33/33), dynamic adapts slightly to latency
    let s1Pct = 33.3;
    let s2Pct = 33.3;
    let s3Pct = 33.4;

    if (config.algorithm === 'least-connections') {
      s1Pct = 34.5;
      s2Pct = 32.5;
      s3Pct = 33.0;
    } else if (config.algorithm === 'dynamic-load-balancing') {
      s1Pct = 35.2;
      s2Pct = 31.0;
      s3Pct = 33.8;
    }

    const s1Req = Math.round((s1Pct / 100) * totalRequests);
    const s2Req = Math.round((s2Pct / 100) * totalRequests);
    const s3Req = totalRequests - s1Req - s2Req;

    const result: AlgorithmTestResult = {
      testId,
      testName: config.name,
      algorithm: config.algorithm,
      workloadName: selectedPresetId ? WORKLOAD_PRESETS.find(p => p.id === selectedPresetId)?.name || 'Custom Load' : 'Custom Load',
      timestamp: new Date().toISOString(),
      durationSeconds: config.durationSeconds,
      totalRequests,
      avgLatencyMs: avgLat,
      p50LatencyMs: Number((avgLat * 0.9).toFixed(1)),
      p95LatencyMs: p95,
      p99LatencyMs: p99,
      throughputRps: config.targetRateRps,
      errorRate: config.algorithm === 'dynamic-load-balancing' ? 0.04 : 0.09,
      healthyBackendsCount: 3,
      totalBackendsCount: 3,
      workloadConfig: {
        targetRateRps: config.targetRateRps,
        virtualUsers: config.virtualUsers,
        durationSeconds: config.durationSeconds,
        endpoint: config.endpoint,
      },
      serverDistribution: [
        { serverId: 'srv-1', serverName: 'Server 1', requestCount: s1Req, percentage: s1Pct, activeConnections: 18, avgLatencyMs: avgLat },
        { serverId: 'srv-2', serverName: 'Server 2', requestCount: s2Req, percentage: s2Pct, activeConnections: 19, avgLatencyMs: Number((avgLat + 1.2).toFixed(1)) },
        { serverId: 'srv-3', serverName: 'Server 3', requestCount: s3Req, percentage: s3Pct, activeConnections: 17, avgLatencyMs: Number((avgLat - 0.8).toFixed(1)) },
      ],
    };

    apiClient.addCompletedTestResult(result);
    onTestCompleted(result);
  };

  const handleStopTest = async () => {
    if (currentTestId) {
      if ((window as any).__loadSphereTestInterval) {
        clearInterval((window as any).__loadSphereTestInterval);
      }
      await apiClient.stopPerformanceTest(currentTestId);
      setIsRunning(false);
      setProgressPercent(0);
    }
  };

  return (
    <div className="space-y-6">
      {/* Role permission check banner */}
      {!canExecuteTests && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs text-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
          <span>
            You are viewing in <strong>Performance Analyst (Read-Only)</strong> mode. Executing and stopping load tests requires Operator or Admin authorization.
          </span>
        </div>
      )}

      {executionError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{executionError}</span>
        </div>
      )}

      {/* Preset selector */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg">
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <Sliders className="h-4 w-4 text-blue-400" />
          Workload Presets
        </h4>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {WORKLOAD_PRESETS.map(preset => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset)}
                disabled={isRunning}
                className={`cursor-pointer text-left rounded-xl border p-4 transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-950/20 shadow ring-1 ring-blue-500/40'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white text-sm">{preset.name}</span>
                  {isSelected && <CheckCircle2 className="h-4 w-4 text-blue-400" />}
                </div>
                <p className="mt-1 text-xs text-slate-400">{preset.description}</p>
                <div className="mt-3 flex items-center gap-3 font-mono text-[11px] text-slate-300">
                  <span>{preset.targetRateRps} RPS</span>
                  <span>•</span>
                  <span>{preset.durationSeconds}s</span>
                  <span>•</span>
                  <span>{preset.virtualUsers} VUs</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Configuration & Controls */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Workload Inputs */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg space-y-4">
          <h4 className="text-sm font-semibold text-white">Workload Parameters & Validation</h4>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-400">Load Balancing Algorithm</label>
              <select
                value={algorithm}
                onChange={e => setAlgorithm(e.target.value as AlgorithmType)}
                disabled={isRunning}
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200 outline-none"
              >
                <option value="round-robin">Round Robin</option>
                <option value="least-connections">Least Connections</option>
                <option value="dynamic-load-balancing">Dynamic Load Balancing</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400">Target Request Rate (RPS)</label>
              <input
                type="number"
                min="10"
                max="5000"
                value={targetRateRps}
                onChange={e => setTargetRateRps(Math.max(10, Math.min(5000, Number(e.target.value))))}
                disabled={isRunning}
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200 outline-none font-mono"
              />
              <span className="text-[10px] text-slate-500">Allowed range: 10 - 5,000 req/s</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400">Concurrent Virtual Users (VUs)</label>
              <input
                type="number"
                min="1"
                max="500"
                value={virtualUsers}
                onChange={e => setVirtualUsers(Math.max(1, Math.min(500, Number(e.target.value))))}
                disabled={isRunning}
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200 outline-none font-mono"
              />
              <span className="text-[10px] text-slate-500">Allowed range: 1 - 500 VUs</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400">Test Duration (Seconds)</label>
              <input
                type="number"
                min="5"
                max="300"
                value={durationSeconds}
                onChange={e => setDurationSeconds(Math.max(5, Math.min(300, Number(e.target.value))))}
                disabled={isRunning}
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200 outline-none font-mono"
              />
              <span className="text-[10px] text-slate-500">Allowed range: 5 - 300 seconds</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400">Authorized Target Endpoint</label>
            <input
              type="text"
              value={endpoint}
              onChange={e => setEndpoint(e.target.value)}
              disabled={isRunning}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200 outline-none font-mono"
            />
            <span className="text-[10px] text-slate-500">Restricted to authorized project internal endpoints</span>
          </div>
        </div>

        {/* Execution & Telemetry Box */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-white">Execution Status</h4>

            {isRunning ? (
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-cyan-400 font-medium animate-pulse">Running Load Generator...</span>
                  <span className="font-mono text-white">{progressPercent}%</span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-slate-800/40 p-2">
                    <span className="text-[10px] text-slate-400">Elapsed</span>
                    <p className="font-mono text-white">{elapsedSeconds}s / {durationSeconds}s</p>
                  </div>
                  <div className="rounded-lg bg-slate-800/40 p-2">
                    <span className="text-[10px] text-slate-400">Instant RPS</span>
                    <p className="font-mono text-emerald-400">{liveRps}</p>
                  </div>
                  <div className="rounded-lg bg-slate-800/40 p-2">
                    <span className="text-[10px] text-slate-400">Live Latency</span>
                    <p className="font-mono text-cyan-400">{liveLatency} ms</p>
                  </div>
                  <div className="rounded-lg bg-slate-800/40 p-2">
                    <span className="text-[10px] text-slate-400">VUs Active</span>
                    <p className="font-mono text-indigo-400">{virtualUsers}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 text-center text-xs text-slate-400">
                <Clock className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                Ready to generate authorized load across the 3 backend servers.
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            {isRunning ? (
              <button
                onClick={handleStopTest}
                className="cursor-pointer w-full flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg hover:bg-rose-500 transition-all"
              >
                <Square className="h-4 w-4" /> Stop Running Test
              </button>
            ) : (
              <button
                onClick={handleStartTest}
                disabled={!canExecuteTests}
                className={`cursor-pointer w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold text-white shadow-lg transition-all ${
                  canExecuteTests
                    ? 'bg-blue-600 hover:bg-blue-500'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Play className="h-4 w-4" /> Start Authorized Load Test
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
