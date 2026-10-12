import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { MetricDataPoint, TimeRangeFilter } from '../types/loadsphere.ts';
import { Download } from 'lucide-react';
import { exportMetricsToCsv } from '../utils/exporter.ts';

interface TrafficChartsProps {
  data: MetricDataPoint[];
  timeRange: TimeRangeFilter;
  onTimeRangeChange: (range: TimeRangeFilter) => void;
  isLoading?: boolean;
}

export const TrafficCharts: React.FC<TrafficChartsProps> = ({
  data,
  timeRange,
  onTimeRangeChange,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<'throughput' | 'latency' | 'distribution' | 'errors'>('throughput');

  const ranges: { id: TimeRangeFilter; label: string }[] = [
    { id: '5m', label: 'Last 5m' },
    { id: '15m', label: 'Last 15m' },
    { id: '1h', label: 'Last 1h' },
    { id: '24h', label: 'Last 24h' },
  ];

  if (!data || data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-slate-400">
        No metric observations available for the selected time window.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md shadow-lg">
      {/* Controls row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
        {/* Metric tabs */}
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-950/60 p-1 border border-slate-800/80">
          <button
            onClick={() => setActiveTab('throughput')}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'throughput'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Throughput (RPS)
          </button>
          <button
            onClick={() => setActiveTab('latency')}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'latency'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Latency (P50/P95/P99)
          </button>
          <button
            onClick={() => setActiveTab('distribution')}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'distribution'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Traffic Distribution
          </button>
          <button
            onClick={() => setActiveTab('errors')}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'errors'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Errors & Success
          </button>
        </div>

        {/* Filters and export */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-slate-950/60 p-1 border border-slate-800/80">
            {ranges.map(r => (
              <button
                key={r.id}
                onClick={() => onTimeRangeChange(r.id)}
                className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  timeRange === r.id
                    ? 'bg-slate-800 text-cyan-400 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => exportMetricsToCsv(data, `loadsphere_metrics_${timeRange}.csv`)}
            className="cursor-pointer flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
            title="Export CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Chart container */}
      <div className="mt-4 h-80 w-full">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-slate-400">
            <span className="animate-pulse">Loading telemetry points...</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {activeTab === 'throughput' ? (
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="formattedTime" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Area
                  type="monotone"
                  dataKey="requestsPerSecond"
                  name="Requests / Second"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRps)"
                />
              </AreaChart>
            ) : activeTab === 'latency' ? (
              <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="formattedTime" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} unit="ms" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Line
                  type="monotone"
                  dataKey="avgLatencyMs"
                  name="Average Latency (ms)"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="p50LatencyMs"
                  name="P50 Latency (ms)"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="p95LatencyMs"
                  name="P95 Latency (ms)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="p99LatencyMs"
                  name="P99 Latency (ms)"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            ) : activeTab === 'distribution' ? (
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="formattedTime" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Area
                  type="monotone"
                  dataKey="server1Requests"
                  name="Server 1 RPS"
                  stackId="1"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="server2Requests"
                  name="Server 2 RPS"
                  stackId="1"
                  stroke="#0ea5e9"
                  fill="#0ea5e9"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="server3Requests"
                  name="Server 3 RPS"
                  stackId="1"
                  stroke="#14b8a6"
                  fill="#14b8a6"
                  fillOpacity={0.6}
                />
              </AreaChart>
            ) : (
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="formattedTime" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Bar dataKey="successfulRequests" name="Successful Requests" fill="#10b981" />
                <Bar dataKey="failedRequests" name="Failed Requests" fill="#f43f5e" />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
