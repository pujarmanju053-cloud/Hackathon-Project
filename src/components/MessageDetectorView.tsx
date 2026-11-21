import { useState } from 'react';
import {
  AlertCircle,
  Brain,
  CheckCircle2,
  Clock,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { ManipulationAxis, MessageAnalysisResult } from '../types';
import { RiskStatusText, formatShortDateTime } from './RiskIndicator';

interface MessageDetectorViewProps {
  activeResult: MessageAnalysisResult | null;
  onScanComplete: (result: MessageAnalysisResult) => void;
}

const SAMPLE_MESSAGES = [
  {
    label: 'Fake WFH Mule Job',
    channel: 'WhatsApp Job Offer',
    text: 'Earn ₹3,000 per day from home! Part-time payment coordinator needed. Use your personal bank account to receive client payments and forward to our merchant UPI within 15 minutes for 5% commission. Pay ₹499 registration fee to start today: https://bit.ly/wfh-fast-pay',
  },
  {
    label: 'Fake KYC Freeze SMS',
    channel: 'SMS Alert',
    text: 'URGENT: Dear customer, your bank KYC is expired. Your account will be blocked today within 2 hours. Update PAN and share OTP immediately at http://sbi-kyc-update-now.xyz',
  },
  {
    label: 'UPI Reward Collect Trap',
    channel: 'Telegram Message',
    text: 'Congratulations! You won ₹25,000 Diwali UPI cashback reward! Approve the collect request and enter your UPI PIN to receive prize money immediately.',
  },
  {
    label: 'Legitimate Bank Alert',
    channel: 'Bank SMS',
    text: 'INR 4,200.00 credited to your Kiosk A/C XX4821 on 20-11-26 via NEFT Scholarship Cell. Available balance: INR 6,450.00.',
  },
];

function ManipulationRadarChart({ axes }: { axes: ManipulationAxis[] }) {
  const size = 280;
  const center = size / 2;
  const maxRadius = 92;
  const levels = [25, 50, 75, 100];

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / axes.length - Math.PI / 2;
    const r = (Math.max(8, value) / 100) * maxRadius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const polygonPoints = axes
    .map((a, idx) => {
      const pt = getPoint(idx, a.score);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-full max-w-[290px] mx-auto overflow-visible"
      role="img"
      aria-label="Manipulation Radar chart showing psychological pressure levels across six techniques"
    >
      {/* Concentric rings */}
      {levels.map((lvl) => {
        const ringPts = axes
          .map((_, idx) => {
            const pt = getPoint(idx, lvl);
            return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
          })
          .join(' ');
        return (
          <polygon
            key={lvl}
            points={ringPts}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        );
      })}

      {/* Spoke lines & labels */}
      {axes.map((axis, idx) => {
        const outer = getPoint(idx, 100);
        const labelPt = getPoint(idx, 126);
        const shortLabel =
          axis.axis === 'Authority Impersonation'
            ? 'Authority'
            : axis.axis === 'Trust Manipulation'
              ? 'Trust'
              : axis.axis === 'Reward Temptation'
                ? 'Reward'
                : axis.axis;
        return (
          <g key={axis.axis}>
            <line
              x1={center}
              y1={center}
              x2={outer.x}
              y2={outer.y}
              stroke="#cbd5e1"
              strokeWidth="1"
            />
            <text
              x={labelPt.x}
              y={labelPt.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-slate-700 text-[10px] font-medium"
            >
              {shortLabel}
            </text>
          </g>
        );
      })}

      {/* Data polygon */}
      <polygon
        points={polygonPoints}
        fill="rgba(13, 148, 136, 0.22)"
        stroke="#0d9488"
        strokeWidth="2"
      />

      {/* Vertices */}
      {axes.map((axis, idx) => {
        const pt = getPoint(idx, axis.score);
        return (
          <circle
            key={axis.axis}
            cx={pt.x}
            cy={pt.y}
            r="3.5"
            fill={axis.score >= 60 ? '#b91c1c' : axis.score >= 35 ? '#b45309' : '#0d9488'}
            stroke="#ffffff"
            strokeWidth="1.5"
          />
        );
      })}
    </svg>
  );
}

export function MessageDetectorView({
  activeResult,
  onScanComplete,
}: MessageDetectorViewProps) {
  const [messageInput, setMessageInput] = useState(
    activeResult?.message ?? SAMPLE_MESSAGES[0].text,
  );
  const [channel, setChannel] = useState(activeResult?.channel ?? 'WhatsApp Job Offer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFutureLab, setShowFutureLab] = useState(true);

  const handleScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (messageInput.trim().length < 5) {
      setError('Please paste a message of at least 5 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/analyze-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageInput, channel }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to analyze message.');
      }
      onScanComplete(payload as MessageAnalysisResult);
      setShowFutureLab(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to scan message right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-teal-700">
          AI Scam Message Detector · Explainable Rule Engine + Manipulation Radar
        </p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">
          Check any job offer, SMS, or payment request before replying
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Paste a suspicious message below. MuleGuard never asks for your PIN, OTP, or bank password.
        </p>
      </div>

      {/* Input Panel */}
      <form
        onSubmit={handleScan}
        className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-medium text-slate-600">
            Try a sample message or paste your own:
          </span>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_MESSAGES.map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => {
                  setMessageInput(sample.text);
                  setChannel(sample.channel);
                  setError(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer"
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3">
            <label htmlFor="scam-message-input" className="block text-xs font-medium text-slate-700 mb-1.5">
              Message text (SMS, WhatsApp, email, Telegram, or payment note)
            </label>
            <textarea
              id="scam-message-input"
              rows={4}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Paste the job offer, KYC alert, or payment forwarding request here..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
            />
          </div>

          <div className="flex flex-col justify-between gap-3">
            <div>
              <label htmlFor="message-channel" className="block text-xs font-medium text-slate-700 mb-1.5">
                Message source
              </label>
              <select
                id="message-channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="WhatsApp Job Offer">WhatsApp Job Offer</option>
                <option value="SMS Alert">SMS Alert</option>
                <option value="Telegram Message">Telegram Message</option>
                <option value="Email">Email</option>
                <option value="UPI Payment Request">UPI Payment Request</option>
                <option value="Bank SMS">Bank SMS</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Scan Message</span>
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </form>

      {/* Results View */}
      {activeResult && (
        <div className="space-y-6">
          {/* Score & Plain-English Explanation */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{activeResult.channel}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeResult.scamCategory}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">
                    {formatShortDateTime(activeResult.analyzedAt)}
                  </span>
                  {activeResult.isDemo && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Simulated Demo Scan</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <RiskStatusText level={activeResult.riskLevel} />
                  {activeResult.aiEnhanced && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-700">
                      <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                      AI-assisted explanation
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs text-slate-500">Advisory Risk Score</div>
                  <div className="text-3xl font-bold font-mono-tabular text-slate-900">
                    {activeResult.riskScore}
                    <span className="text-base font-normal text-slate-400">/100</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  style={{ width: `${activeResult.riskScore}%` }}
                  className={`h-full transition-all duration-300 ${
                    activeResult.riskScore > 70
                      ? 'bg-red-600'
                      : activeResult.riskScore > 30
                        ? 'bg-amber-600'
                        : 'bg-emerald-600'
                  }`}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-[11px] text-slate-500 font-mono-tabular">
                <span>0–30 Low Risk</span>
                <span>31–70 Medium Risk</span>
                <span>71–100 High Risk</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5 pt-5 border-t border-slate-100">
              <div className="lg:col-span-7 space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Plain-English Explanation
                  </h2>
                  <p className="text-sm text-slate-700 leading-relaxed mt-1.5">
                    {activeResult.simpleExplanation}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    {activeResult.aiStatusNote} Advisory result only — not proof of criminal intent.
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Detected Red Flags ({activeResult.detectedRedFlags.length})
                  </h3>
                  {activeResult.detectedRedFlags.length === 0 ? (
                    <p className="text-sm text-emerald-700 mt-1.5 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      No known money mule, fee, OTP, or phishing red flags were matched.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                      {activeResult.detectedRedFlags.map((flag) => (
                        <li key={flag} className="flex items-start gap-2">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
                          <span>{flag}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="lg:col-span-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Top 3 Reasons Contributing to Score
                  </h3>
                  <div className="mt-2 space-y-2.5">
                    {activeResult.topReasons.map((reason, idx) => (
                      <div
                        key={reason.id}
                        className="p-3 rounded-lg bg-slate-50 border border-slate-200"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-900">
                          <span>
                            {idx + 1}. {reason.label}
                          </span>
                          <span className="font-mono-tabular text-teal-800">
                            +{reason.points} pts
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{reason.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Recommended Next Steps
                  </h3>
                  <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                    {activeResult.recommendedNextSteps.map((step) => (
                      <li key={step} className="flex items-start gap-2">
                        <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Manipulation Radar + Scam Future Lab */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Manipulation Radar */}
            <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-teal-700" aria-hidden="true" />
                <h2 className="text-base font-semibold text-slate-900">
                  Manipulation Radar
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Psychological pressure tactics used to make you act before checking with family or your bank
              </p>

              <div className="my-4">
                <ManipulationRadarChart axes={activeResult.manipulationRadar} />
              </div>

              <div className="space-y-2.5 pt-3 border-t border-slate-100">
                {activeResult.manipulationRadar.map((item) => (
                  <div key={item.axis} className="text-xs">
                    <div className="flex items-center justify-between font-medium text-slate-800">
                      <span>{item.axis}</span>
                      <span className="font-mono-tabular text-slate-600">
                        {item.score}/100
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${item.score}%` }}
                        className={`h-full ${
                          item.score >= 60
                            ? 'bg-red-600'
                            : item.score >= 35
                              ? 'bg-amber-600'
                              : 'bg-teal-600'
                        }`}
                      />
                    </div>
                    <p className="text-slate-500 mt-1">{item.explanation}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Scam Future Lab */}
            <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-700" aria-hidden="true" />
                    <h2 className="text-base font-semibold text-slate-900">
                      Scam Future Lab
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Interactive 4-stage progression showing how similar scams typically unfold
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowFutureLab((prev) => !prev)}
                  className="px-4 py-2 rounded-lg bg-[#0B1F3A] hover:bg-slate-800 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {showFutureLab
                    ? 'Hide Scam Progression'
                    : 'Show How This Scam Could Progress'}
                </button>
              </div>

              {!showFutureLab ? (
                <div className="py-10 text-center space-y-3">
                  <p className="text-sm text-slate-600 max-w-md mx-auto">
                    Click &ldquo;Show How This Scam Could Progress&rdquo; to preview the 4-stage timeline from first contact to financial risk.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <div className="relative pl-6 space-y-5 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                    {activeResult.scamFutureLab.map((stage) => (
                      <div key={stage.stage} className="relative">
                        <span
                          className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold font-mono-tabular ${
                            stage.stage === 4
                              ? 'bg-red-700 text-white'
                              : stage.stage === 3
                                ? 'bg-amber-600 text-white'
                                : 'bg-[#0B1F3A] text-white'
                          }`}
                        >
                          {stage.stage}
                        </span>
                        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                          <h3 className="text-sm font-semibold text-slate-900">
                            {stage.title}
                          </h3>
                          <p className="text-sm text-slate-700 mt-1">{stage.summary}</p>
                          <div className="mt-2.5 pt-2.5 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="font-semibold text-amber-800">Warning sign: </span>
                              <span className="text-slate-600">{stage.warningSign}</span>
                            </div>
                            <div>
                              <span className="font-semibold text-teal-800">Safe action: </span>
                              <span className="text-slate-600">{stage.safeAction}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                    Simulated educational scenario based on common scam patterns—not a prediction of an actual criminal&apos;s behavior.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
