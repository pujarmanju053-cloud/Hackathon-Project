import {
  Activity,
  ArrowRight,
  BellRing,
  BookOpenCheck,
  FileSpreadsheet,
  MessageSquareWarning,
  ShieldAlert,
} from 'lucide-react';
import type { DashboardPayload, FraudAlert, MessageAnalysisResult } from '../types';
import { RiskStatusText, formatShortDateTime } from './RiskIndicator';

interface DashboardViewProps {
  data: DashboardPayload | null;
  loading: boolean;
  onNavigate: (tab: string) => void;
  onSelectScan: (scan: MessageAnalysisResult) => void;
  onSelectAlert: (alert: FraudAlert) => void;
}

export function DashboardView({
  data,
  loading,
  onNavigate,
  onSelectScan,
  onSelectAlert,
}: DashboardViewProps) {
  if (loading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl p-5" />
          ))}
        </div>
        <div className="h-72 bg-white border border-slate-200 rounded-xl" />
      </div>
    );
  }

  const { metrics, activityChart, recentScans, recentAlerts } = data;
  const maxChartVal = Math.max(
    1,
    ...activityChart.flatMap((d) => [d.scans, d.suspiciousTx, d.highRiskAlerts]),
  );

  return (
    <div className="space-y-6">
      {/* Intro & Demo Notice */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-teal-700 tracking-normal">
            Kiosk &amp; First-Time Digital Banking Protection · Simulated Demo Data
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight text-balance mt-1">
            Stay safe from money mule traps before you transfer
          </h1>
          <p className="text-sm text-slate-600 mt-1.5 max-w-2xl">
            Check suspicious job offers, scan kiosk or UPI transaction logs, and get plain-English safety guidance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('emergency')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-700 hover:bg-red-800 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>I Think I Have Been Scammed</span>
        </button>
      </div>

      {/* 4-column KPI strip */}
      <section
        aria-label="Key safety metrics"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200"
      >
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Total Message Scans</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-900 font-mono-tabular">
              {metrics.totalMessageScans}
            </span>
            <span className="text-xs text-slate-500">Demo + Session</span>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            SMS, WhatsApp &amp; job offers checked
          </p>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Transactions Analysed</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-900 font-mono-tabular">
              {metrics.transactionsAnalysed}
            </span>
            <span className="text-xs text-teal-700 font-medium">Active ledger</span>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            UPI &amp; kiosk entries screened for mule flow
          </p>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Suspicious Activities</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-amber-700 font-mono-tabular">
              {metrics.suspiciousActivities}
            </span>
            <span className="text-xs text-slate-500">Medium / High</span>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Messages &amp; pass-through patterns flagged
          </p>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">High-Risk Alerts</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-red-700 font-mono-tabular">
              {metrics.highRiskAlerts}
            </span>
            <span className="text-xs text-red-700 font-medium">Review advised</span>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Urgent fraud warnings requiring attention
          </p>
        </div>
      </section>

      {/* Quick Actions */}
      <section aria-label="Quick actions" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => onNavigate('messages')}
          className="group flex items-center justify-between gap-3 p-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-left transition-colors cursor-pointer"
        >
          <div>
            <div className="text-sm font-semibold">Scan a Message</div>
            <div className="text-xs text-teal-100 mt-0.5">Check job offers &amp; SMS</div>
          </div>
          <MessageSquareWarning className="w-5 h-5 shrink-0 text-teal-100 group-hover:translate-x-0.5 transition-transform" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate('transactions')}
          className="group flex items-center justify-between gap-3 p-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 text-left transition-colors cursor-pointer"
        >
          <div>
            <div className="text-sm font-semibold">Analyse Transactions</div>
            <div className="text-xs text-slate-500 mt-0.5">Upload CSV or test sample</div>
          </div>
          <FileSpreadsheet className="w-5 h-5 shrink-0 text-teal-700 group-hover:translate-x-0.5 transition-transform" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate('alerts')}
          className="group flex items-center justify-between gap-3 p-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 text-left transition-colors cursor-pointer"
        >
          <div>
            <div className="text-sm font-semibold">View Fraud Alerts</div>
            <div className="text-xs text-slate-500 mt-0.5">Inspect flagged events</div>
          </div>
          <BellRing className="w-5 h-5 shrink-0 text-amber-700 group-hover:translate-x-0.5 transition-transform" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate('awareness')}
          className="group flex items-center justify-between gap-3 p-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 text-left transition-colors cursor-pointer"
        >
          <div>
            <div className="text-sm font-semibold">Learn Fraud Safety</div>
            <div className="text-xs text-slate-500 mt-0.5">Guides &amp; safety quiz</div>
          </div>
          <BookOpenCheck className="w-5 h-5 shrink-0 text-slate-700 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </section>

      {/* Fraud Activity Analytics Chart + Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-700" aria-hidden="true" />
                <span>Fraud Activity Analytics (Simulated 7-Day View)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Message scans vs. suspicious mule transactions and high-risk alerts
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#0B1F3A]" />
                Scans
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-teal-600" />
                Suspicious Tx
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-600" />
                High Alerts
              </span>
            </div>
          </div>

          <div className="mt-5">
            <div className="grid grid-cols-7 gap-3 items-end h-52 pt-4">
              {activityChart.map((d) => {
                const scanH = Math.max(8, Math.round((d.scans / maxChartVal) * 160));
                const txH = Math.max(4, Math.round((d.suspiciousTx / maxChartVal) * 160));
                const alertH = Math.max(4, Math.round((d.highRiskAlerts / maxChartVal) * 160));
                return (
                  <div key={d.day} className="flex flex-col items-center gap-2">
                    <div className="flex items-end gap-1 h-44 w-full justify-center">
                      <div
                        style={{ height: `${scanH}px` }}
                        title={`${d.day}: ${d.scans} scans`}
                        className="w-2.5 sm:w-3.5 rounded-t bg-[#0B1F3A] transition-all"
                      />
                      <div
                        style={{ height: `${txH}px` }}
                        title={`${d.day}: ${d.suspiciousTx} suspicious tx`}
                        className="w-2.5 sm:w-3.5 rounded-t bg-teal-600 transition-all"
                      />
                      <div
                        style={{ height: `${alertH}px` }}
                        title={`${d.day}: ${d.highRiskAlerts} high-risk alerts`}
                        className="w-2.5 sm:w-3.5 rounded-t bg-red-600 transition-all"
                      />
                    </div>
                    <div className="text-xs font-medium text-slate-600 font-mono-tabular">
                      {d.day}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Demo baseline metrics combined with your live session scans</span>
            <button
              type="button"
              onClick={() => onNavigate('transactions')}
              className="text-teal-700 hover:text-teal-800 font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Deep-dive transaction analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Recent Suspicious Transaction & Scam Alerts */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Recent Suspicious Alerts
              </h2>
              <p className="text-xs text-slate-500">Click any alert to inspect details</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('alerts')}
              className="text-xs font-medium text-teal-700 hover:text-teal-800 whitespace-nowrap cursor-pointer"
            >
              View all
            </button>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {recentAlerts.slice(0, 4).map((alert) => (
              <button
                key={alert.id}
                type="button"
                onClick={() => onSelectAlert(alert)}
                className="w-full py-3.5 text-left hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <RiskStatusText level={alert.severity} score={alert.riskScore} />
                  <span className="text-slate-500 font-mono-tabular">
                    {formatShortDateTime(alert.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-slate-900 line-clamp-1">
                  {alert.reason}
                </p>
                <div className="mt-1 text-xs text-slate-500 flex items-center gap-2">
                  <span>{alert.sourceType}</span>
                  <span aria-hidden="true">·</span>
                  <span>Status: {alert.status}</span>
                  {alert.relatedTransactionId && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">{alert.relatedTransactionId}</span>
                    </>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Scan History Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Recent Scan History</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select a previous scan to open its Manipulation Radar and Scam Future Lab
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('messages')}
            className="text-xs font-medium text-teal-700 hover:text-teal-800 whitespace-nowrap cursor-pointer"
          >
            New message scan
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                <th className="py-2.5 px-5">Message Preview</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Channel</th>
                <th className="py-2.5 px-4">Risk Assessment</th>
                <th className="py-2.5 px-5 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {recentScans.map((scan) => (
                <tr
                  key={scan.id}
                  onClick={() => onSelectScan(scan)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-5 max-w-md">
                    <p className="font-medium text-slate-900 truncate">{scan.message}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {scan.topReasons[0]?.label}
                      {scan.isDemo ? ' · Simulated Demo' : ''}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                    {scan.scamCategory}
                  </td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                    {scan.channel}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <RiskStatusText level={scan.riskLevel} score={scan.riskScore} />
                  </td>
                  <td className="py-3 px-5 text-right text-xs text-slate-500 font-mono-tabular whitespace-nowrap">
                    {formatShortDateTime(scan.analyzedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
