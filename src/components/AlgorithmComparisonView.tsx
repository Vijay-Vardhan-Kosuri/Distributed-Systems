import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Trophy,
  Activity,
  Zap,
  BarChart2,
  Clock,
  Layers,
  Info,
  Download,
} from 'lucide-react';
import { AlgorithmTestResult, AlgorithmType } from '../types/loadsphere.ts';
import {
  evaluateAlgorithmWinners,
  formatAlgorithmName,
  formatLatency,
  formatThroughput,
  formatPercentage,
} from '../utils/metrics.ts';
import { exportTestResultsToCsv } from '../utils/exporter.ts';

interface AlgorithmComparisonViewProps {
  results: AlgorithmTestResult[];
}

export const AlgorithmComparisonView: React.FC<AlgorithmComparisonViewProps> = ({ results }) => {
  const [selectedWorkload, setSelectedWorkload] = useState<string>('all');
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>('all');

  // Filter workloads
  const workloadOptions = Array.from(new Set(results.map(r => r.workloadName)));

  const filteredResults = results.filter(r => {
    const matchWorkload = selectedWorkload === 'all' || r.workloadName === selectedWorkload;
    const matchAlgo = selectedAlgorithm === 'all' || r.algorithm === selectedAlgorithm;
    return matchWorkload && matchAlgo;
  });

  // Calculate winner summary across currently displayed results
  const winners = evaluateAlgorithmWinners(
    filteredResults.map(r => ({
      algorithm: r.algorithm,
      avgLatencyMs: r.avgLatencyMs,
      throughputRps: r.throughputRps,
      errorRate: r.errorRate,
      serverDistribution: r.serverDistribution,
    }))
  );

  // Prepare chart comparison data
  const chartData = filteredResults.map(r => {
    const s1 = r.serverDistribution.find(s => s.serverId === 'srv-1')?.percentage || 0;
    const s2 = r.serverDistribution.find(s => s.serverId === 'srv-2')?.percentage || 0;
    const s3 = r.serverDistribution.find(s => s.serverId === 'srv-3')?.percentage || 0;

    return {
      name: formatAlgorithmName(r.algorithm),
      workload: r.workloadName,
      avgLatencyMs: r.avgLatencyMs,
      p95LatencyMs: r.p95LatencyMs,
      throughputRps: r.throughputRps,
      errorRate: r.errorRate,
      server1Pct: s1,
      server2Pct: s2,
      server3Pct: s3,
    };
  });

  if (results.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center backdrop-blur-md">
        <Activity className="mx-auto h-12 w-12 text-slate-500" />
        <h3 className="mt-3 text-lg font-medium text-white">No Benchmark Test Results</h3>
        <p className="mt-1 text-sm text-slate-400">
          Run benchmarks across Round Robin, Least Connections, and Dynamic Load Balancing in the Performance Testing tab to view empirical comparisons.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner: Scientific comparison disclaimer */}
      <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-4 text-xs text-indigo-300 flex items-start gap-3">
        <Info className="h-5 w-5 shrink-0 text-indigo-400 mt-0.5" />
        <div>
          <strong className="text-white">Distributed Observability Principle:</strong> Comparisons are scientifically meaningful only when the workload, concurrency, test duration, backend node configuration, and target endpoints are strictly consistent. Conclusions below are derived from empirical telemetry.
        </div>
      </div>

      {/* Filter and Export Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Workload:</span>
            <select
              value={selectedWorkload}
              onChange={e => setSelectedWorkload(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 outline-none"
            >
              <option value="all">All Workloads</option>
              {workloadOptions.map(w => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Algorithm:</span>
            <select
              value={selectedAlgorithm}
              onChange={e => setSelectedAlgorithm(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 outline-none"
            >
              <option value="all">All Algorithms</option>
              <option value="round-robin">Round Robin</option>
              <option value="least-connections">Least Connections</option>
              <option value="dynamic-load-balancing">Dynamic Load Balancing</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => exportTestResultsToCsv(filteredResults)}
          className="cursor-pointer flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export Benchmark Data</span>
        </button>
      </div>

      {/* Empirical Winner Analysis Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/10 p-4 shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Lowest Latency</span>
            <Trophy className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2">
            <div className="text-base font-bold text-white">
              {winners.lowestLatency ? formatAlgorithmName(winners.lowestLatency.algorithm) : 'N/A'}
            </div>
            <div className="mt-1 text-xs text-cyan-300 font-mono">
              Avg: {formatLatency(winners.lowestLatency?.value)}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-4 shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Highest Throughput</span>
            <Zap className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <div className="text-base font-bold text-white">
              {winners.highestThroughput ? formatAlgorithmName(winners.highestThroughput.algorithm) : 'N/A'}
            </div>
            <div className="mt-1 text-xs text-emerald-300 font-mono">
              Throughput: {formatThroughput(winners.highestThroughput?.value)}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-rose-500/30 bg-rose-950/10 p-4 shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">Lowest Error Rate</span>
            <Activity className="h-4 w-4 text-rose-400" />
          </div>
          <div className="mt-2">
            <div className="text-base font-bold text-white">
              {winners.lowestErrorRate ? formatAlgorithmName(winners.lowestErrorRate.algorithm) : 'N/A'}
            </div>
            <div className="mt-1 text-xs text-rose-300 font-mono">
              Errors: {formatPercentage(winners.lowestErrorRate?.value)}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/10 p-4 shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Most Balanced</span>
            <Layers className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-2">
            <div className="text-base font-bold text-white">
              {winners.mostBalanced ? formatAlgorithmName(winners.mostBalanced.algorithm) : 'N/A'}
            </div>
            <div className="mt-1 text-xs text-indigo-300 font-mono">
              Deviation score: ±{winners.mostBalanced?.deviationScore}%
            </div>
          </div>
        </div>
      </div>

      {/* Latency and Throughput Comparison Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Latency Chart */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Clock className="h-4 w-4 text-cyan-400" />
            Response Latency Benchmark (Avg & P95)
          </h4>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} interval={0} angle={-10} textAnchor="end" />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} unit="ms" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="avgLatencyMs" name="Avg Latency (ms)" fill="#06b6d4" />
                <Bar dataKey="p95LatencyMs" name="P95 Latency (ms)" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Server Traffic Distribution Balance Chart */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-indigo-400" />
            Traffic Distribution Balance Across 3 Nodes (%)
          </h4>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} interval={0} angle={-10} textAnchor="end" />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="server1Pct" name="Server 1 %" fill="#6366f1" stackId="a" />
                <Bar dataKey="server2Pct" name="Server 2 %" fill="#0ea5e9" stackId="a" />
                <Bar dataKey="server3Pct" name="Server 3 %" fill="#14b8a6" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Empirical Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-lg">
        <div className="p-4 border-b border-slate-800">
          <h4 className="text-sm font-semibold text-white">Completed Benchmark Runs Dataset</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Algorithm</th>
                <th className="px-4 py-3">Workload</th>
                <th className="px-4 py-3">Throughput</th>
                <th className="px-4 py-3">Avg Latency</th>
                <th className="px-4 py-3">P95 Latency</th>
                <th className="px-4 py-3">P99 Latency</th>
                <th className="px-4 py-3">Error Rate</th>
                <th className="px-4 py-3">Server Distribution (1 / 2 / 3)</th>
                <th className="px-4 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredResults.map(r => {
                const s1 = r.serverDistribution.find(s => s.serverId === 'srv-1')?.percentage || 0;
                const s2 = r.serverDistribution.find(s => s.serverId === 'srv-2')?.percentage || 0;
                const s3 = r.serverDistribution.find(s => s.serverId === 'srv-3')?.percentage || 0;

                return (
                  <tr key={r.testId} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-sans font-medium text-white">{formatAlgorithmName(r.algorithm)}</td>
                    <td className="px-4 py-3 font-sans text-slate-300">{r.workloadName}</td>
                    <td className="px-4 py-3 text-emerald-400">{formatThroughput(r.throughputRps)}</td>
                    <td className="px-4 py-3 text-cyan-400">{formatLatency(r.avgLatencyMs)}</td>
                    <td className="px-4 py-3 text-amber-400">{formatLatency(r.p95LatencyMs)}</td>
                    <td className="px-4 py-3 text-rose-400">{formatLatency(r.p99LatencyMs)}</td>
                    <td className="px-4 py-3 text-slate-300">{formatPercentage(r.errorRate)}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {s1}% / {s2}% / {s3}%
                    </td>
                    <td className="px-4 py-3 font-sans text-slate-500">{new Date(r.timestamp).toLocaleTimeString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
