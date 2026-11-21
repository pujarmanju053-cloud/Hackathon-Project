import { useMemo, useState } from 'react';
import { BellRing, Check, RotateCcw, Search } from 'lucide-react';
import type { FraudAlert, SeverityLevel } from '../types';
import { RiskStatusText, formatShortDateTime } from './RiskIndicator';

interface AlertCenterViewProps {
  alerts: FraudAlert[];
  selectedAlertId: string | null;
  onSelectAlert: (id: string) => void;
  onToggleStatus: (id: string, nextStatus: 'New' | 'Reviewed') => Promise<void>;
}

export function AlertCenterView({
  alerts,
  selectedAlertId,
  onSelectAlert,
  onToggleStatus,
}: AlertCenterViewProps) {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'All' | SeverityLevel>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'New' | 'Reviewed'>('All');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return alerts.filter((a) => {
      if (severityFilter !== 'All' && a.severity !== severityFilter) return false;
      if (statusFilter !== 'All' && a.status !== statusFilter) return false;
      if (!q) return true;
      return (
        a.id.toLowerCase().includes(q) ||
        a.reason.toLowerCase().includes(q) ||
        a.explanation.toLowerCase().includes(q) ||
        (a.relatedTransactionId ?? '').toLowerCase().includes(q)
      );
    });
  }, [alerts, search, severityFilter, statusFilter]);

  const activeAlert =
    filtered.find((a) => a.id === selectedAlertId) ?? filtered[0] ?? null;

  const handleToggle = async (alert: FraudAlert) => {
    setUpdatingId(alert.id);
    try {
      await onToggleStatus(alert.id, alert.status === 'New' ? 'Reviewed' : 'New');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-teal-700">
          Fraud Alert Center · Search, Filter &amp; Review
        </p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">
          Suspicious activity alerts &amp; advisory reviews
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Inspect why an alert was raised, review linked transactions or messages, and mark items as reviewed.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alert ID, reason, or transaction..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['All', 'High', 'Medium', 'Low'] as const).map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${
                  severityFilter === sev
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {sev === 'All' ? 'All Severities' : sev}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['All', 'New', 'Reviewed'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'All' ? 'All Statuses' : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alert List + Details Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-10 text-center">
              <BellRing className="w-7 h-7 text-slate-400 mx-auto" />
              <p className="text-sm font-medium text-slate-700 mt-2">
                No alerts match your current filter.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((alert) => {
                const isSelected = activeAlert?.id === alert.id;
                return (
                  <button
                    key={alert.id}
                    type="button"
                    onClick={() => onSelectAlert(alert.id)}
                    className={`w-full p-4 text-left transition-colors cursor-pointer ${
                      isSelected ? 'bg-teal-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <RiskStatusText level={alert.severity} score={alert.riskScore} />
                      <span className="text-slate-500 font-mono-tabular">
                        {formatShortDateTime(alert.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm font-semibold text-slate-900">
                      {alert.reason}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono-tabular">{alert.id}</span>
                      <span aria-hidden="true">·</span>
                      <span>{alert.sourceType}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          alert.status === 'Reviewed'
                            ? 'text-emerald-700 font-medium'
                            : 'text-amber-700 font-medium'
                        }
                      >
                        {alert.status}
                      </span>
                      {alert.relatedTransactionId && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular">{alert.relatedTransactionId}</span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <aside className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5">
          {!activeAlert ? (
            <p className="text-sm text-slate-500 py-8 text-center">
              Select an alert from the list to view its details.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="text-xs text-slate-500 font-mono-tabular">
                    {activeAlert.id} · {formatShortDateTime(activeAlert.createdAt)}
                  </div>
                  <h2 className="text-base font-semibold text-slate-900 mt-1">
                    {activeAlert.reason}
                  </h2>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <RiskStatusText
                  level={activeAlert.severity}
                  score={activeAlert.riskScore}
                />
                <span className="text-xs font-medium text-slate-600">
                  Status: {activeAlert.status}
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 leading-relaxed">
                {activeAlert.explanation}
              </div>

              <dl className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <dt className="text-slate-500">Detection Source</dt>
                  <dd className="font-medium text-slate-900 mt-0.5">
                    {activeAlert.sourceType}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Related Reference</dt>
                  <dd className="font-mono-tabular font-medium text-slate-900 mt-0.5">
                    {activeAlert.relatedTransactionId ?? activeAlert.relatedScanId ?? 'N/A'}
                  </dd>
                </div>
              </dl>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={updatingId === activeAlert.id}
                  onClick={() => void handleToggle(activeAlert)}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    activeAlert.status === 'New'
                      ? 'bg-teal-700 hover:bg-teal-800 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  }`}
                >
                  {activeAlert.status === 'New' ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Mark Alert as Reviewed</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>Reopen Alert</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-slate-500">
                Advisory alert only. MuleGuard warns and educates users and does not accuse anyone of criminal conduct.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
