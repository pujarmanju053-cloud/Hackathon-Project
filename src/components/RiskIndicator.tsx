import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { RiskLevel, SeverityLevel } from '../types';

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function formatShortDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function RiskStatusText({
  level,
  score,
}: {
  level: RiskLevel | SeverityLevel;
  score?: number;
}) {
  const isHigh = level === 'High Risk' || level === 'High';
  const isMed = level === 'Medium Risk' || level === 'Medium';

  const colorClass = isHigh
    ? 'text-red-700'
    : isMed
      ? 'text-amber-700'
      : 'text-emerald-700';

  const Icon = isHigh ? ShieldAlert : isMed ? AlertTriangle : CheckCircle2;

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium whitespace-nowrap ${colorClass}`}>
      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>{level}</span>
      {typeof score === 'number' && (
        <span className="font-mono-tabular text-xs text-slate-500">
          · {score}/100
        </span>
      )}
    </span>
  );
}
