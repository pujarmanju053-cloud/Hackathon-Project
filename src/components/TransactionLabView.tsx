import { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Download,
  FileSpreadsheet,
  Loader2,
  Search,
  Upload,
} from 'lucide-react';
import type { RiskLevel, TransactionAnalysisSummary } from '../types';
import { RiskStatusText, formatInr, formatShortDateTime } from './RiskIndicator';

interface TransactionLabViewProps {
  summary: TransactionAnalysisSummary | null;
  onAnalysisComplete: (next: TransactionAnalysisSummary) => void;
}

export function TransactionLabView({
  summary,
  onAnalysisComplete,
}: TransactionLabViewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'All' | RiskLevel>('All');
  const [typeFilter, setTypeFilter] = useState<'All' | 'CREDIT' | 'DEBIT'>('All');
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);

  const runAnalysis = async (body: Record<string, unknown>) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/analyze-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to analyze transactions.');
      }
      onAnalysisComplete(payload as TransactionAnalysisSummary);
      setSelectedTxId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to analyze transaction CSV.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      void runAnalysis({ csvText: text, datasetName: file.name });
    };
    reader.onerror = () => {
      setError('Could not read the selected CSV file.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDownloadReport = () => {
    if (!summary) return;
    const reportBlob = new Blob([JSON.stringify(summary, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(reportBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `muleguard-transaction-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredTx = useMemo(() => {
    if (!summary) return [];
    const q = searchQuery.trim().toLowerCase();
    return summary.transactions.filter((tx) => {
      if (riskFilter !== 'All' && tx.riskLevel !== riskFilter) return false;
      if (typeFilter !== 'All' && tx.type !== typeFilter) return false;
      if (!q) return true;
      return (
        tx.id.toLowerCase().includes(q) ||
        tx.sender.toLowerCase().includes(q) ||
        tx.receiver.toLowerCase().includes(q) ||
        tx.suspiciousPattern.toLowerCase().includes(q) ||
        tx.description.toLowerCase().includes(q)
      );
    });
  }, [summary, searchQuery, riskFilter, typeFilter]);

  const selectedTx =
    summary?.transactions.find((t) => t.id === selectedTxId) ??
    filteredTx.find((t) => t.riskLevel === 'High Risk') ??
    filteredTx[0] ??
    null;

  const incomingNodes = summary?.flowNodes.filter((n) => n.role === 'source') ?? [];
  const outgoingNodes = summary?.flowNodes.filter((n) => n.role === 'destination') ?? [];
  const kioskNode = summary?.flowNodes.find((n) => n.role === 'kiosk_account');

  const maxBucketAmount = summary
    ? Math.max(1, ...summary.timeSeries.flatMap((b) => [b.incoming, b.outgoing]))
    : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-teal-700">
            Money Mule Transaction Detector &amp; Analytics · Simulated Demo Ready
          </p>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Inspect pass-through transfers &amp; mule patterns
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Upload a transaction CSV or load a sample ledger to detect rapid forwarding, smurfing, and near-zero balance sweeps.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>Upload Transaction CSV</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => void runAnalysis({ preset: 'mule' })}
            className="px-3.5 py-2.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            Load Sample Mule CSV
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => void runAnalysis({ preset: 'normal' })}
            className="px-3.5 py-2.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            Load Sample Safe CSV
          </button>

          <a
            href="/api/sample-csv/mule"
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium text-teal-700 hover:text-teal-800 hover:bg-teal-50 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Sample CSV</span>
          </a>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!summary ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto" />
          <h2 className="text-base font-semibold text-slate-900 mt-3">
            No transaction dataset loaded
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Upload a CSV file or select one of the sample datasets above to begin.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Strip */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-700">{summary.datasetName}</span>
                  <span aria-hidden="true">·</span>
                  <span>{summary.isDemo ? 'Simulated Demo Data' : 'Uploaded CSV Analysis'}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">
                    {formatShortDateTime(summary.analyzedAt)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3">
                  <RiskStatusText
                    level={summary.overallRiskLevel}
                    score={summary.overallMuleRiskScore}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadReport}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-medium whitespace-nowrap self-start cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Risk Report</span>
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
              <div>
                <div className="text-xs text-slate-500">Total Incoming</div>
                <div className="text-xl font-bold text-slate-900 font-mono-tabular mt-1">
                  {formatInr(summary.totalIncoming)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Total Outgoing</div>
                <div className="text-xl font-bold text-slate-900 font-mono-tabular mt-1">
                  {formatInr(summary.totalOutgoing)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Flagged Transactions</div>
                <div className="text-xl font-bold text-amber-700 font-mono-tabular mt-1">
                  {summary.suspiciousCount} / {summary.totalTransactions}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">High-Risk Transfers</div>
                <div className="text-xl font-bold text-red-700 font-mono-tabular mt-1">
                  {summary.highRiskCount}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-xs font-semibold text-slate-700 mb-2">
                Top 3 Contributing Mule Indicators (Advisory)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {summary.topReasons.map((r, i) => (
                  <div key={r.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
                      <span>
                        {i + 1}. {r.label}
                      </span>
                      <span className="font-mono-tabular text-teal-800">+{r.points} pts</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{r.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Visual Transaction Flow Diagram */}
          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="pb-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">
                Visual Money Flow (Entering &amp; Leaving Account)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Shows how funds arrive from multiple sources into the kiosk account and flow out to destination accounts
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 lg:grid-cols-11 gap-4 items-center">
              {/* Incoming Sources */}
              <div className="lg:col-span-4 space-y-2">
                <div className="text-xs font-semibold text-slate-500 pb-1">
                  Incoming Senders ({incomingNodes.length})
                </div>
                {incomingNodes.map((node) => (
                  <div
                    key={node.id}
                    className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                      node.riskLevel === 'High Risk'
                        ? 'bg-red-50/70 border-red-200'
                        : node.riskLevel === 'Medium Risk'
                          ? 'bg-amber-50/70 border-amber-200'
                          : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{node.label}</div>
                      <div className="text-slate-500 mt-0.5">
                        {node.txCount} credit{node.txCount > 1 ? 's' : ''} · {node.riskLevel}
                      </div>
                    </div>
                    <div className="font-mono-tabular font-semibold text-slate-900 shrink-0">
                      +{formatInr(node.totalAmount)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Arrow In */}
              <div className="lg:col-span-1 flex justify-center py-1">
                <ArrowRight className="w-5 h-5 text-teal-700 rotate-90 lg:rotate-0" />
              </div>

              {/* Center Kiosk Account */}
              <div className="lg:col-span-2">
                <div className="p-4 rounded-xl bg-[#0B1F3A] text-white text-center space-y-1.5">
                  <div className="text-xs text-teal-300 font-medium">Monitored Account</div>
                  <div className="text-sm font-bold">
                    {kioskNode?.label ?? 'User Kiosk Account'}
                  </div>
                  <div className="text-xs text-slate-300 font-mono-tabular">
                    In: {formatInr(summary.totalIncoming)}
                  </div>
                  <div className="text-xs text-slate-300 font-mono-tabular">
                    Out: {formatInr(summary.totalOutgoing)}
                  </div>
                  <div className="pt-1 text-xs font-semibold text-teal-300">
                    {summary.overallRiskLevel} ({summary.overallMuleRiskScore}/100)
                  </div>
                </div>
              </div>

              {/* Arrow Out */}
              <div className="lg:col-span-1 flex justify-center py-1">
                <ArrowRight className="w-5 h-5 text-red-600 rotate-90 lg:rotate-0" />
              </div>

              {/* Outgoing Destinations */}
              <div className="lg:col-span-3 space-y-2">
                <div className="text-xs font-semibold text-slate-500 pb-1">
                  Outgoing Recipients ({outgoingNodes.length})
                </div>
                {outgoingNodes.map((node) => (
                  <div
                    key={node.id}
                    className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                      node.riskLevel === 'High Risk'
                        ? 'bg-red-50/70 border-red-200'
                        : node.riskLevel === 'Medium Risk'
                          ? 'bg-amber-50/70 border-amber-200'
                          : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{node.label}</div>
                      <div className="text-slate-500 mt-0.5">
                        {node.txCount} debit{node.txCount > 1 ? 's' : ''} · {node.riskLevel}
                      </div>
                    </div>
                    <div className="font-mono-tabular font-semibold text-slate-900 shrink-0">
                      -{formatInr(node.totalAmount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Transaction Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Incoming vs Outgoing & Activity Over Time */}
            <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Incoming vs. Outgoing &amp; Activity Over Time
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Rapid pass-through appears as matching teal incoming and crimson outgoing bars in the same hour
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-teal-600" />
                    In
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#0B1F3A]" />
                    Out
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-end gap-3 h-48 overflow-x-auto pt-4 pb-1">
                {summary.timeSeries.map((b) => {
                  const inH = Math.max(4, Math.round((b.incoming / maxBucketAmount) * 145));
                  const outH = Math.max(4, Math.round((b.outgoing / maxBucketAmount) * 145));
                  return (
                    <div
                      key={b.label}
                      className="flex-1 min-w-[44px] flex flex-col items-center gap-2"
                    >
                      <div className="flex items-end gap-1 h-40">
                        <div
                          style={{ height: `${inH}px` }}
                          title={`${b.label} In: ${formatInr(b.incoming)}`}
                          className="w-3.5 rounded-t bg-teal-600"
                        />
                        <div
                          style={{ height: `${outH}px` }}
                          title={`${b.label} Out: ${formatInr(b.outgoing)}`}
                          className="w-3.5 rounded-t bg-[#0B1F3A]"
                        />
                      </div>
                      <span className="text-[11px] font-mono-tabular text-slate-600">
                        {b.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Suspicious vs Normal & Risk Distribution */}
            <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Suspicious vs. Normal &amp; Risk Distribution
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Breakdown of analyzed transactions by risk tier
                </p>

                <div className="mt-5 space-y-3.5">
                  {[
                    {
                      label: 'Low Risk (Normal)',
                      count: summary.riskDistribution.low,
                      color: 'bg-emerald-600',
                    },
                    {
                      label: 'Medium Risk (Review)',
                      count: summary.riskDistribution.medium,
                      color: 'bg-amber-600',
                    },
                    {
                      label: 'High Risk (Mule Pattern)',
                      count: summary.riskDistribution.high,
                      color: 'bg-red-600',
                    },
                  ].map((item) => {
                    const pct =
                      summary.totalTransactions > 0
                        ? Math.round((item.count / summary.totalTransactions) * 100)
                        : 0;
                    return (
                      <div key={item.label}>
                        <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                          <span>{item.label}</span>
                          <span className="font-mono-tabular">
                            {item.count} ({pct}%)
                          </span>
                        </div>
                        <div className="mt-1.5 h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div style={{ width: `${pct}%` }} className={`h-full ${item.color}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-slate-500">Suspicious Tx</div>
                  <div className="text-lg font-bold text-red-700 font-mono-tabular mt-0.5">
                    {summary.suspiciousCount}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-slate-500">Normal Tx</div>
                  <div className="text-lg font-bold text-emerald-700 font-mono-tabular mt-0.5">
                    {summary.totalTransactions - summary.suspiciousCount}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Filterable Transaction Table + Row Detail */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Analyzed Transactions ({filteredTx.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Click any row to inspect the top reasons behind its risk score
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search ID, sender, pattern..."
                    className="pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  {(['All', 'High Risk', 'Medium Risk', 'Low Risk'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setRiskFilter(lvl)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                        riskFilter === lvl
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  {(['All', 'CREDIT', 'DEBIT'] as const).map((tp) => (
                    <button
                      key={tp}
                      type="button"
                      onClick={() => setTypeFilter(tp)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                        typeFilter === tp
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tp}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                    <th className="py-2.5 px-4">Tx ID</th>
                    <th className="py-2.5 px-4">Time</th>
                    <th className="py-2.5 px-4">Sender → Receiver</th>
                    <th className="py-2.5 px-4">Suspicious Pattern</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                    <th className="py-2.5 px-4 text-right">Bal After</th>
                    <th className="py-2.5 px-4">Risk Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {filteredTx.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No transactions match your current search or filters.
                      </td>
                    </tr>
                  ) : (
                    filteredTx.map((tx) => {
                      const active = selectedTx?.id === tx.id;
                      return (
                        <tr
                          key={tx.id}
                          onClick={() => setSelectedTxId(tx.id)}
                          className={`cursor-pointer transition-colors ${
                            active ? 'bg-teal-50/60' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-3 px-4 font-mono-tabular font-medium text-slate-900 whitespace-nowrap">
                            {tx.id}
                          </td>
                          <td className="py-3 px-4 font-mono-tabular text-slate-600 whitespace-nowrap">
                            {formatShortDateTime(tx.timestamp)}
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <div className="font-medium text-slate-900 truncate">
                              {tx.sender} → {tx.receiver}
                            </div>
                            <div className="text-xs text-slate-500 truncate">{tx.description}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                            {tx.suspiciousPattern}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-mono-tabular font-semibold whitespace-nowrap ${
                              tx.type === 'CREDIT' ? 'text-emerald-700' : 'text-slate-900'
                            }`}
                          >
                            {tx.type === 'CREDIT' ? '+' : '-'}
                            {formatInr(tx.amount)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono-tabular text-slate-600 whitespace-nowrap">
                            {formatInr(tx.balanceAfter)}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <RiskStatusText level={tx.riskLevel} score={tx.riskScore} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {selectedTx && (
              <div className="p-5 bg-slate-50 border-t border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-900">
                    Transaction Breakdown: <span className="font-mono-tabular">{selectedTx.id}</span>
                  </div>
                  <RiskStatusText level={selectedTx.riskLevel} score={selectedTx.riskScore} />
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {selectedTx.topReasons.map((r, i) => (
                    <div key={r.id} className="p-3 rounded-lg bg-white border border-slate-200">
                      <div className="text-xs font-semibold text-slate-900 flex justify-between">
                        <span>
                          {i + 1}. {r.label}
                        </span>
                        <span className="font-mono-tabular text-teal-800">+{r.points}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{r.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
