import { useCallback, useEffect, useState } from 'react';
import {
  BellRing,
  BookOpenCheck,
  FileSpreadsheet,
  LayoutDashboard,
  Menu,
  MessageSquareWarning,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { AlertCenterView } from './components/AlertCenterView';
import { AwarenessQuizView } from './components/AwarenessQuizView';
import { DashboardView } from './components/DashboardView';
import { EmergencyHelpView } from './components/EmergencyHelpView';
import { MessageDetectorView } from './components/MessageDetectorView';
import { RiskEngineView } from './components/RiskEngineView';
import { TransactionLabView } from './components/TransactionLabView';
import type {
  DashboardPayload,
  FraudAlert,
  MessageAnalysisResult,
  RiskEngineConfig,
  TransactionAnalysisSummary,
} from './types';

type TabId =
  | 'dashboard'
  | 'messages'
  | 'transactions'
  | 'alerts'
  | 'risk'
  | 'emergency'
  | 'awareness';

const NAV_ITEMS: Array<{ id: TabId; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'messages', label: 'Message Detector', icon: MessageSquareWarning },
  { id: 'transactions', label: 'Mule Transaction Lab', icon: FileSpreadsheet },
  { id: 'alerts', label: 'Fraud Alert Center', icon: BellRing },
  { id: 'risk', label: 'Explainable Risk Engine', icon: SlidersHorizontal },
  { id: 'emergency', label: 'Emergency Assistance', icon: ShieldAlert },
  { id: 'awareness', label: 'Safety Guide & Quiz', icon: BookOpenCheck },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [activeScan, setActiveScan] = useState<MessageAnalysisResult | null>(null);
  const [txSummary, setTxSummary] = useState<TransactionAnalysisSummary | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspaceData = useCallback(async () => {
    try {
      const [dashRes, alertsRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/alerts'),
      ]);
      if (!dashRes.ok || !alertsRes.ok) {
        throw new Error('Failed to load MuleGuard backend data.');
      }
      const dashJson = (await dashRes.json()) as DashboardPayload;
      const alertsJson = (await alertsRes.json()) as FraudAlert[];
      setDashboard(dashJson);
      setAlerts(alertsJson);
      setTxSummary(dashJson.transactionSummary);
      setActiveScan((prev) => prev ?? dashJson.recentScans[0] ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach MuleGuard API.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspaceData();
  }, [loadWorkspaceData]);

  const handleNavigate = (tab: string) => {
    setActiveTab(tab as TabId);
    setMobileMenuOpen(false);
  };

  const handleScanComplete = (result: MessageAnalysisResult) => {
    setActiveScan(result);
    void loadWorkspaceData();
  };

  const handleTxAnalysisComplete = (summary: TransactionAnalysisSummary) => {
    setTxSummary(summary);
    void loadWorkspaceData();
  };

  const handleToggleAlertStatus = async (id: string, nextStatus: 'New' | 'Reviewed') => {
    const res = await fetch(`/api/alerts/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      await loadWorkspaceData();
    }
  };

  const handleConfigSaved = (_nextConfig: RiskEngineConfig) => {
    void loadWorkspaceData();
  };

  const currentNavLabel =
    NAV_ITEMS.find((item) => item.id === activeTab)?.label ?? 'Dashboard';

  const openAlertsCount = alerts.filter((a) => a.status === 'New').length;

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-[#0B1F3A] text-white">
        <div className="h-16 px-5 flex items-center gap-2.5 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight whitespace-nowrap">
            MuleGuard
          </span>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-teal-600 text-white'
                    : item.id === 'emergency'
                      ? 'text-red-200 hover:bg-white/10 hover:text-white'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.id === 'alerts' && openAlertsCount > 0 && (
                  <span className="text-xs font-mono-tabular text-teal-200">
                    {openAlertsCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 text-xs text-slate-300 space-y-1.5">
          <div className="font-semibold text-white">Need Urgent Help?</div>
          <p className="text-slate-400 leading-relaxed">
            Dial <span className="font-mono-tabular text-white font-semibold">1930</span> or report at cybercrime.gov.in for financial fraud.
          </p>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-[#0B1F3A] text-white flex flex-col h-full z-10">
            <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <span className="font-display font-bold text-lg">MuleGuard</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="p-1.5 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-3 rounded-lg text-sm font-medium cursor-pointer ${
                      active
                        ? 'bg-teal-600 text-white'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Bar (Contextual Breadcrumb + 1-2 Actions) */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-500 hidden sm:inline whitespace-nowrap">
                MuleGuard
              </span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-slate-900 truncate">
                {currentNavLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => handleNavigate('emergency')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Emergency Help</span>
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('messages')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0B1F3A] hover:bg-slate-800 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Scan Message</span>
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800 flex items-center justify-between gap-3">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => void loadWorkspaceData()}
                className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-xs font-semibold cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              data={dashboard}
              loading={loading}
              onNavigate={handleNavigate}
              onSelectScan={(scan) => {
                setActiveScan(scan);
                handleNavigate('messages');
              }}
              onSelectAlert={(alert) => {
                setSelectedAlertId(alert.id);
                handleNavigate('alerts');
              }}
            />
          )}

          {activeTab === 'messages' && (
            <MessageDetectorView
              activeResult={activeScan}
              onScanComplete={handleScanComplete}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionLabView
              summary={txSummary}
              onAnalysisComplete={handleTxAnalysisComplete}
            />
          )}

          {activeTab === 'alerts' && (
            <AlertCenterView
              alerts={alerts}
              selectedAlertId={selectedAlertId}
              onSelectAlert={(id) => setSelectedAlertId(id)}
              onToggleStatus={handleToggleAlertStatus}
            />
          )}

          {activeTab === 'risk' && dashboard && (
            <RiskEngineView
              config={dashboard.riskConfig}
              defaultMessageScore={activeScan?.riskScore ?? 78}
              defaultMuleScore={txSummary?.overallMuleRiskScore ?? 82}
              onConfigSaved={handleConfigSaved}
            />
          )}

          {activeTab === 'emergency' && <EmergencyHelpView />}

          {activeTab === 'awareness' && <AwarenessQuizView />}
        </main>

        {/* Quiet Responsible AI & Prototype Footer */}
        <footer className="border-t border-slate-200 bg-white px-4 sm:px-6 lg:px-8 py-4 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>
            MuleGuard is an independent hackathon prototype and is not an official SBI application.
          </span>
          <span>
            Simulated demo data · Risk scores are advisory only and never request PINs, OTPs, or passwords.
          </span>
        </footer>
      </div>
    </div>
  );
}
