import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  description: string;
  trend?: {
    value: number;
    isPositiveGood?: boolean;
    text: string;
  };
  statusVariant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  unit,
  icon: Icon,
  description,
  trend,
  statusVariant = 'default',
}) => {
  const getVariantStyles = () => {
    switch (statusVariant) {
      case 'success':
        return 'border-emerald-500/30 bg-emerald-950/10 text-emerald-400';
      case 'warning':
        return 'border-amber-500/30 bg-amber-950/10 text-amber-400';
      case 'danger':
        return 'border-rose-500/30 bg-rose-950/10 text-rose-400';
      case 'info':
        return 'border-cyan-500/30 bg-cyan-950/10 text-cyan-400';
      default:
        return 'border-slate-800 bg-slate-900/60 text-slate-300';
    }
  };

  const getIconStyles = () => {
    switch (statusVariant) {
      case 'success':
        return 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20';
      case 'warning':
        return 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20';
      case 'danger':
        return 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20';
      case 'info':
        return 'bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20';
      default:
        return 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20';
    }
  };

  return (
    <div
      className={`rounded-xl border p-5 backdrop-blur-md transition-all duration-200 hover:border-slate-700/80 shadow-lg ${getVariantStyles()}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">{title}</span>
        <div className={`rounded-lg p-2 ${getIconStyles()}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tracking-tight text-white font-mono">{value}</span>
        {unit && <span className="text-xs font-medium text-slate-400">{unit}</span>}
      </div>

      <p className="mt-1 text-xs text-slate-400 line-clamp-1">{description}</p>

      {trend && (
        <div className="mt-2.5 flex items-center text-xs">
          <span
            className={`font-medium ${
              trend.value >= 0
                ? trend.isPositiveGood !== false
                  ? 'text-emerald-400'
                  : 'text-rose-400'
                : trend.isPositiveGood !== false
                ? 'text-rose-400'
                : 'text-emerald-400'
            }`}
          >
            {trend.value > 0 ? `+${trend.value}%` : `${trend.value}%`}
          </span>
          <span className="ml-1 text-slate-500">{trend.text}</span>
        </div>
      )}
    </div>
  );
};
