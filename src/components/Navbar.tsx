import React from 'react';
import { UserRole } from '../types/loadsphere.ts';
import { Shield, ShieldAlert, UserCheck, RefreshCw, Radio } from 'lucide-react';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  lastUpdated: string | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  isMockMode: boolean;
  onToggleMockMode: (val: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  lastUpdated,
  onRefresh,
  isRefreshing,
  isMockMode,
  onToggleMockMode,
}) => {
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="flex items-center gap-1 rounded-md bg-purple-500/20 px-2 py-1 text-xs font-semibold text-purple-300 ring-1 ring-purple-500/40">
            <ShieldAlert className="h-3.5 w-3.5 text-purple-400" /> Admin
          </span>
        );
      case 'operator':
        return (
          <span className="flex items-center gap-1 rounded-md bg-blue-500/20 px-2 py-1 text-xs font-semibold text-blue-300 ring-1 ring-blue-500/40">
            <Shield className="h-3.5 w-3.5 text-blue-400" /> LB Operator
          </span>
        );
      case 'analyst':
        return (
          <span className="flex items-center gap-1 rounded-md bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/40">
            <UserCheck className="h-3.5 w-3.5 text-emerald-400" /> Analyst (Read-Only)
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 shadow-md ring-1 ring-cyan-400/30">
            <Radio className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-white">LOADSPHERE</span>
              <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-400 ring-1 ring-cyan-500/20">
                OBSERVABILITY
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Distributed Load Balancing & Performance Analysis</p>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-3">
          {/* Mock Adapter toggle badge */}
          <button
            onClick={() => onToggleMockMode(!isMockMode)}
            className={`cursor-pointer hidden sm:flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              isMockMode
                ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30 hover:bg-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30 hover:bg-emerald-500/20'
            }`}
            title="Click to toggle between Mock Adapter & Live Backend Endpoint"
          >
            <span className={`h-2 w-2 rounded-full ${isMockMode ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            <span>Mode: {isMockMode ? 'Dev Mock Adapter' : 'Live Backend API'}</span>
          </button>

          {/* Refresh timestamp & trigger */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {lastUpdated && (
              <span className="hidden md:inline font-mono text-[11px]">
                Refreshed: {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700 hover:text-white transition-all disabled:opacity-50"
              title="Manual Data Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>

          {/* Role selector */}
          <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
            <select
              value={currentRole}
              onChange={e => onRoleChange(e.target.value as UserRole)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 outline-none cursor-pointer"
            >
              <option value="admin">Admin</option>
              <option value="operator">LB Operator</option>
              <option value="analyst">Performance Analyst</option>
            </select>
            <div className="hidden sm:block">{getRoleBadge(currentRole)}</div>
          </div>
        </div>
      </div>
    </header>
  );
};
