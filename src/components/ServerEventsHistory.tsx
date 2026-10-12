import React, { useState } from 'react';
import {
  ServerEvent,
  EventSeverity,
  EventType,
} from '../types/loadsphere.ts';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Info,
  Filter,
  Download,
  Clock,
  Server,
} from 'lucide-react';
import { exportEventsToCsv } from '../utils/exporter.ts';

interface ServerEventsHistoryProps {
  events: ServerEvent[];
}

export const ServerEventsHistory: React.FC<ServerEventsHistoryProps> = ({ events }) => {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredEvents = events.filter(e => {
    const matchSev = severityFilter === 'all' || e.severity === severityFilter;
    const matchSearch =
      searchTerm === '' ||
      e.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.serverName && e.serverName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      e.type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSev && matchSearch;
  });

  const getSeverityBadge = (severity: EventSeverity) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-400 ring-1 ring-rose-500/30">
            <AlertOctagon className="h-3 w-3" /> Critical
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-400 ring-1 ring-amber-500/30">
            <AlertTriangle className="h-3 w-3" /> Warning
          </span>
        );
      case 'recovery':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
            <CheckCircle2 className="h-3 w-3" /> Recovery
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-400 ring-1 ring-blue-500/30">
            <Info className="h-3 w-3" /> Info
          </span>
        );
    }
  };

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-400 backdrop-blur-md">
        <Clock className="mx-auto h-12 w-12 text-slate-500" />
        <h3 className="mt-3 text-lg font-medium text-white">No Server Incidents Logged</h3>
        <p className="mt-1 text-sm text-slate-400">
          No failover or health degradation events have been registered by the load balancer.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md space-y-4">
      {/* Header & filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
        <div>
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Server className="h-4 w-4 text-cyan-400" />
            Backend Failover & Incident History
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Authoritative lifecycle transitions: health probe failures, traffic shedding, warm-up recovery, and pool re-entry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 outline-none placeholder:text-slate-500"
          />

          {/* Severity selector */}
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 outline-none"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="recovery">Recovery</option>
            <option value="info">Info</option>
          </select>

          <button
            onClick={() => exportEventsToCsv(filteredEvents)}
            className="cursor-pointer flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Events timeline list */}
      <div className="space-y-3">
        {filteredEvents.map(evt => (
          <div
            key={evt.id}
            className="flex items-start justify-between gap-4 rounded-lg border border-slate-800/80 bg-slate-950/40 p-3.5 hover:border-slate-700 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{getSeverityBadge(evt.severity)}</div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">{evt.type.replace(/_/g, ' ')}</span>
                  {evt.serverName && (
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 font-mono">
                      {evt.serverName}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-300">{evt.message}</p>
                {evt.details && (
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-400 font-mono">
                    {Object.entries(evt.details).map(([k, v]) => (
                      <span key={k} className="rounded bg-slate-900 border border-slate-800 px-2 py-0.5">
                        {k}: <strong className="text-slate-200">{String(v)}</strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0 text-right text-[11px] text-slate-500 font-mono">
              <div>{new Date(evt.timestamp).toLocaleTimeString()}</div>
              <div>{new Date(evt.timestamp).toLocaleDateString()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
