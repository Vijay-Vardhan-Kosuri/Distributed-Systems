import React from 'react';
import {
  Server,
  Activity,
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Cpu,
  Layers,
} from 'lucide-react';
import { BackendServer, ServerHealthStatus } from '../types/loadsphere.ts';
import { formatLatency, formatThroughput, formatPercentage, formatRequestCount } from '../utils/metrics.ts';

interface ServerCardProps {
  server: BackendServer;
  canManageServer?: boolean;
  onSimulateStatus?: (serverId: string, status: 'healthy' | 'unhealthy' | 'degraded') => void;
}

export const ServerCard: React.FC<ServerCardProps> = ({
  server,
  canManageServer = false,
  onSimulateStatus,
}) => {
  const getStatusBadge = (status: ServerHealthStatus) => {
    switch (status) {
      case 'healthy':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/30">
            <CheckCircle2 className="h-3 w-3" /> Healthy
          </span>
        );
      case 'degraded':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400 ring-1 ring-amber-500/30">
            <AlertTriangle className="h-3 w-3" /> Degraded
          </span>
        );
      case 'unhealthy':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-400 ring-1 ring-rose-500/30">
            <AlertTriangle className="h-3 w-3" /> Unhealthy (No Traffic)
          </span>
        );
      case 'recovering':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-medium text-cyan-400 ring-1 ring-cyan-500/30">
            <RefreshCw className="h-3 w-3 animate-spin" /> Recovering
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-medium text-slate-400 ring-1 ring-slate-500/30">
            Unknown
          </span>
        );
    }
  };

  const isDiverted = server.status === 'unhealthy';

  return (
    <div
      className={`relative rounded-xl border p-5 backdrop-blur-md transition-all shadow-lg ${
        isDiverted
          ? 'border-rose-900/60 bg-rose-950/10 text-slate-400 opacity-90'
          : 'border-slate-800 bg-slate-900/60 text-slate-200'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`rounded-lg p-2.5 ring-1 ${
              isDiverted
                ? 'bg-rose-500/10 text-rose-400 ring-rose-500/20'
                : 'bg-indigo-500/10 text-indigo-400 ring-indigo-500/20'
            }`}
          >
            <Server className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-base font-semibold text-white">{server.name}</h4>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span>{server.address}</span>
              <span>•</span>
              <span>ID: {server.id}</span>
            </div>
          </div>
        </div>
        <div>{getStatusBadge(server.status)}</div>
      </div>

      {isDiverted && (
        <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-300">
          ⚠️ <strong>Traffic Diverted:</strong> Server failed health checks. Load balancer is routing zero requests to this node.
        </div>
      )}

      {/* Grid of metrics */}
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <div className="rounded-lg bg-slate-800/40 p-2.5">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Zap className="h-3.5 w-3.5 text-emerald-400" />
            <span>Availability</span>
          </div>
          <p className="mt-1 font-mono font-bold text-white">{formatPercentage(server.availability)}</p>
        </div>

        <div className="rounded-lg bg-slate-800/40 p-2.5">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Clock className="h-3.5 w-3.5 text-cyan-400" />
            <span>Avg Response</span>
          </div>
          <p className="mt-1 font-mono font-bold text-white">{formatLatency(server.avgResponseTimeMs)}</p>
        </div>

        <div className="rounded-lg bg-slate-800/40 p-2.5">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Activity className="h-3.5 w-3.5 text-blue-400" />
            <span>Throughput</span>
          </div>
          <p className="mt-1 font-mono font-bold text-white">{formatThroughput(server.throughputRps)}</p>
        </div>

        <div className="rounded-lg bg-slate-800/40 p-2.5">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Layers className="h-3.5 w-3.5 text-indigo-400" />
            <span>Connections</span>
          </div>
          <p className="mt-1 font-mono font-bold text-white">
            {server.activeConnections !== null ? server.activeConnections : 'Unavailable'}
          </p>
        </div>
      </div>

      {/* Hardware / Secondary stats */}
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-lg bg-slate-800/20 px-3 py-2 border border-slate-800/60">
          <span className="text-slate-400">Requests:</span>
          <span className="font-mono font-semibold text-slate-200">{formatRequestCount(server.requestCount)}</span>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-slate-800/20 px-3 py-2 border border-slate-800/60">
          <span className="text-slate-400">Error Rate:</span>
          <span className={`font-mono font-semibold ${server.errorRate > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
            {formatPercentage(server.errorRate)} ({server.errorCount})
          </span>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-slate-800/20 px-3 py-2 border border-slate-800/60">
          <span className="text-slate-400 flex items-center gap-1">
            <Cpu className="h-3 w-3" /> CPU / RAM:
          </span>
          <span className="font-mono font-semibold text-slate-200">
            {server.cpuUsagePercent !== null ? `${server.cpuUsagePercent}%` : 'N/A'} /{' '}
            {server.memoryUsagePercent !== null ? `${server.memoryUsagePercent}%` : 'N/A'}
          </span>
        </div>
      </div>

      {/* Footer: timestamps & controls */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-3 text-xs text-slate-400">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>Last Health Check: {new Date(server.lastHealthCheck).toLocaleTimeString()}</span>
        </div>

        {canManageServer && onSimulateStatus && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[11px]">Failover Test:</span>
            {server.status === 'healthy' ? (
              <button
                onClick={() => onSimulateStatus(server.id, 'unhealthy')}
                className="cursor-pointer rounded bg-rose-500/20 px-2 py-0.5 text-[11px] font-medium text-rose-300 hover:bg-rose-500/30 ring-1 ring-rose-500/30"
              >
                Trigger Outage
              </button>
            ) : (
              <button
                onClick={() => onSimulateStatus(server.id, 'healthy')}
                className="cursor-pointer rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/30 ring-1 ring-emerald-500/30"
              >
                Trigger Recovery
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
