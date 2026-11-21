import { useEffect, useState } from 'react';
import { CheckCircle2, Info, SlidersHorizontal } from 'lucide-react';
import type { CombinedRiskEvaluation, RiskEngineConfig } from '../types';
import { RiskStatusText } from './RiskIndicator';

interface RiskEngineViewProps {
  config: RiskEngineConfig;
  defaultMessageScore: number;
  defaultMuleScore: number;
  onConfigSaved: (next: RiskEngineConfig) => void;
}

export function RiskEngineView({
  config,
  defaultMessageScore,
  defaultMuleScore,
  onConfigSaved,
}: RiskEngineViewProps) {
  const [draft, setDraft] = useState<RiskEngineConfig>(config);
  const [msgScore, setMsgScore] = useState(defaultMessageScore);
  const [muleScore, setMuleScore] = useState(defaultMuleScore);
  const [anomalyScore, setAnomalyScore] = useState(64);
  const [evaluation, setEvaluation] = useState<CombinedRiskEvaluation | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/risk-evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            messageScore: msgScore,
            mulePatternScore: muleScore,
            anomalyScore,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as CombinedRiskEvaluation;
          setEvaluation(data);
        }
      } catch {
        // Ignore abort
      }
    }, 100);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [msgScore, muleScore, anomalyScore, config]);

  const handleSaveConfig = async () => {
    setSaving(true);
    setError(null);
    setSaveMessage(null);
    try {
      const res = await fetch('/api/risk-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Could not update risk thresholds.');
      }
      onConfigSaved(payload as RiskEngineConfig);
      setSaveMessage('Thresholds and weights updated across dashboard, scans, and transactions.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const totalW = Math.max(
    1,
    draft.messageWeight + draft.mulePatternWeight + draft.anomalyWeight,
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-teal-700">
          Explainable Risk Engine · Transparent Weighted Scoring
        </p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">
          Configure scoring weights &amp; inspect combined risk
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          MuleGuard combines message scam indicators, money mule rule checks, and transaction anomalies into one transparent advisory score.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Configuration Panel */}
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <SlidersHorizontal className="w-4 h-4 text-teal-700" />
            <h2 className="text-base font-semibold text-slate-900">
              Configurable Weights &amp; Thresholds
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700">
                <span>Message Scam Detection Weight</span>
                <span className="font-mono-tabular">
                  {draft.messageWeight} ({Math.round((draft.messageWeight / totalW) * 100)}%)
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={draft.messageWeight}
                onChange={(e) =>
                  setDraft({ ...draft, messageWeight: Number(e.target.value) })
                }
                className="w-full mt-1.5 accent-teal-700"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700">
                <span>Mule Pattern Rule Weight</span>
                <span className="font-mono-tabular">
                  {draft.mulePatternWeight} (
                  {Math.round((draft.mulePatternWeight / totalW) * 100)}%)
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={draft.mulePatternWeight}
                onChange={(e) =>
                  setDraft({ ...draft, mulePatternWeight: Number(e.target.value) })
                }
                className="w-full mt-1.5 accent-teal-700"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700">
                <span>Transaction Anomaly Weight</span>
                <span className="font-mono-tabular">
                  {draft.anomalyWeight} ({Math.round((draft.anomalyWeight / totalW) * 100)}%)
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={draft.anomalyWeight}
                onChange={(e) =>
                  setDraft({ ...draft, anomalyWeight: Number(e.target.value) })
                }
                className="w-full mt-1.5 accent-teal-700"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="low-max" className="block text-xs font-medium text-slate-700">
                Low Risk Max (0 – {draft.lowThresholdMax})
              </label>
              <input
                id="low-max"
                type="number"
                min={10}
                max={draft.mediumThresholdMax - 5}
                value={draft.lowThresholdMax}
                onChange={(e) =>
                  setDraft({ ...draft, lowThresholdMax: Number(e.target.value) })
                }
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="med-max" className="block text-xs font-medium text-slate-700">
                Medium Risk Max ({draft.lowThresholdMax + 1} – {draft.mediumThresholdMax})
              </label>
              <input
                id="med-max"
                type="number"
                min={draft.lowThresholdMax + 5}
                max={95}
                value={draft.mediumThresholdMax}
                onChange={(e) =>
                  setDraft({ ...draft, mediumThresholdMax: Number(e.target.value) })
                }
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-700">{error}</p>}
          {saveMessage && (
            <p className="text-xs text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{saveMessage}</span>
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSaveConfig()}
              className="px-4 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              {saving ? 'Applying...' : 'Apply Risk Settings'}
            </button>
            <button
              type="button"
              onClick={() =>
                setDraft({
                  messageWeight: 40,
                  mulePatternWeight: 35,
                  anomalyWeight: 25,
                  lowThresholdMax: 30,
                  mediumThresholdMax: 70,
                })
              }
              className="px-3.5 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium transition-colors cursor-pointer"
            >
              Reset Defaults
            </button>
          </div>
        </section>

        {/* Combined Risk Simulator */}
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Combined Risk Score Simulator
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Adjust individual signal scores to inspect the explainable output
              </p>
            </div>
            {evaluation && (
              <RiskStatusText
                level={evaluation.riskLevel}
                score={evaluation.combinedScore}
              />
            )}
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700">
                <span>Message Scam Signal</span>
                <span className="font-mono-tabular">{msgScore}/100</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={msgScore}
                onChange={(e) => setMsgScore(Number(e.target.value))}
                className="w-full mt-1 accent-[#0B1F3A]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700">
                <span>Mule Pattern Rule Signal</span>
                <span className="font-mono-tabular">{muleScore}/100</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={muleScore}
                onChange={(e) => setMuleScore(Number(e.target.value))}
                className="w-full mt-1 accent-[#0B1F3A]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700">
                <span>Transaction Anomaly Signal</span>
                <span className="font-mono-tabular">{anomalyScore}/100</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={anomalyScore}
                onChange={(e) => setAnomalyScore(Number(e.target.value))}
                className="w-full mt-1 accent-[#0B1F3A]"
              />
            </div>
          </div>

          {evaluation && (
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="text-xs font-semibold text-slate-800">
                Top 3 Reasons Driving Combined Score ({evaluation.combinedScore}/100)
              </div>
              {evaluation.topReasons.map((r, i) => (
                <div key={r.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex justify-between text-xs font-semibold text-slate-900">
                    <span>
                      {i + 1}. {r.label}
                    </span>
                    <span className="font-mono-tabular text-teal-800">
                      +{r.points} weighted pts
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{r.detail}</p>
                </div>
              ))}
            </div>
          )}

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
            <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <p>
              <strong>Responsible AI Disclaimer:</strong> Risk scores are advisory guidance only and may be incorrect. Never treat a risk score as proof of crime or criminal intent.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
