import { useState } from 'react';
import {
  CheckSquare,
  Download,
  ExternalLink,
  PhoneCall,
  ShieldAlert,
  Square,
} from 'lucide-react';

const EMERGENCY_STEPS = [
  {
    step: 1,
    title: 'Stop transferring or forwarding money immediately',
    detail:
      'Do not send any more money, do not pay "unblock fees" or "tax charges," and stop all communication with the sender or recruiter.',
  },
  {
    step: 2,
    title: 'Contact your bank immediately through official channels',
    detail:
      'Call the toll-free number printed on the back of your debit card or passbook, or visit your nearest kiosk/bank branch to report unauthorized or suspicious transfers.',
  },
  {
    step: 3,
    title: 'Secure your banking account and change compromised credentials',
    detail:
      'Ask your bank to freeze your UPI ID, debit card, or net banking if compromised, and change your banking passwords from a safe device. Never share OTPs or PINs with anyone.',
  },
  {
    step: 4,
    title: 'Preserve messages, screenshots, transaction IDs, and evidence',
    detail:
      'Do not delete WhatsApp/Telegram chats, SMS alerts, phone numbers, UPI IDs, or bank transaction reference numbers (UTR). Save clear screenshots.',
  },
  {
    step: 5,
    title: 'Report financial cyber fraud at cybercrime.gov.in',
    detail:
      'File a complaint on the National Cyber Crime Reporting Portal (https://cybercrime.gov.in) under "Report Financial Fraud" with your UTR/transaction ID and screenshots.',
  },
  {
    step: 6,
    title: "Call India's cyber fraud helpline 1930 as soon as possible",
    detail:
      'Dial 1930 immediately (ideally within the first 1–2 hours). Early reporting gives authorities the best chance to freeze the recipient account before funds are withdrawn.',
  },
];

export function EmergencyHelpView() {
  const [checkedSteps, setCheckedSteps] = useState<number[]>([]);
  const [incidentNotes, setIncidentNotes] = useState('');
  const [approxAmount, setApproxAmount] = useState('');
  const [txRef, setTxRef] = useState('');

  const toggleStep = (step: number) => {
    setCheckedSteps((prev) =>
      prev.includes(step) ? prev.filter((s) => s !== step) : [...prev, step],
    );
  };

  const handleDownloadNotes = () => {
    const lines = [
      'MULEGUARD - PERSONAL INCIDENT PREPARATION NOTES',
      `Generated: ${new Date().toLocaleString('en-IN')}`,
      'Note: Keep this summary for your bank branch visit, 1930 call, or cybercrime.gov.in filing.',
      'NEVER write your OTP, ATM PIN, UPI PIN, or net-banking password anywhere.',
      '------------------------------------------------------------',
      `Approximate Amount Involved: ${approxAmount || 'Not entered'}`,
      `Transaction / UTR Reference ID: ${txRef || 'Not entered'}`,
      `Steps Completed (${checkedSteps.length}/6): ${checkedSteps.sort((a, b) => a - b).join(', ') || 'None ticked yet'}`,
      '',
      'Incident Timeline & Counterparty Details:',
      incidentNotes || 'No notes entered.',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `muleguard-incident-checklist-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Urgent Header Banner */}
      <div className="bg-[#0B1F3A] text-white rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-red-300">
            <ShieldAlert className="w-4 h-4" />
            <span>Emergency Fraud Assistance</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Act calmly and quickly—you are doing the right thing by stopping now
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            If you already transferred money, forwarded funds for a job offer, or clicked a suspicious link, follow these 6 steps right away.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          <a
            href="tel:1930"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors whitespace-nowrap"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Call Helpline 1930</span>
          </a>
          <a
            href="https://cybercrime.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white text-[#0B1F3A] hover:bg-slate-100 text-sm font-semibold transition-colors whitespace-nowrap"
          >
            <span>cybercrime.gov.in</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* 6 Action Steps + Checklist Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">
              6 Immediate Steps to Protect Yourself
            </h2>
            <span className="text-xs font-mono-tabular text-teal-700 font-semibold">
              {checkedSteps.length} / 6 completed
            </span>
          </div>

          <div className="space-y-3">
            {EMERGENCY_STEPS.map((item) => {
              const done = checkedSteps.includes(item.step);
              return (
                <button
                  key={item.step}
                  type="button"
                  onClick={() => toggleStep(item.step)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors flex items-start gap-3.5 cursor-pointer ${
                    done
                      ? 'bg-emerald-50/60 border-emerald-200'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="mt-0.5 text-teal-700 shrink-0">
                    {done ? (
                      <CheckSquare className="w-5 h-5 text-emerald-700" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400" />
                    )}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {item.step}. {item.title}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                      {item.detail}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Evidence Organizer */}
        <aside className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">
              Evidence &amp; Report Preparation Notes
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Jot down details locally so you have everything ready when calling 1930 or visiting your bank. Never enter PINs, OTPs, or passwords.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="em-amount" className="block text-xs font-medium text-slate-700 mb-1">
                Approximate amount involved (₹)
              </label>
              <input
                id="em-amount"
                type="text"
                value={approxAmount}
                onChange={(e) => setApproxAmount(e.target.value)}
                placeholder="e.g., ₹14,000"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="em-utr" className="block text-xs font-medium text-slate-700 mb-1">
                Transaction / UTR Reference ID (if known)
              </label>
              <input
                id="em-utr"
                type="text"
                value={txRef}
                onChange={(e) => setTxRef(e.target.value)}
                placeholder="e.g., 432519882104"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular"
              />
            </div>

            <div>
              <label htmlFor="em-notes" className="block text-xs font-medium text-slate-700 mb-1">
                What happened? (Sender phone/UPI ID, date &amp; time)
              </label>
              <textarea
                id="em-notes"
                rows={4}
                value={incidentNotes}
                onChange={(e) => setIncidentNotes(e.target.value)}
                placeholder="Write down the sender's phone number, UPI ID, WhatsApp group name, and exact time of transfer..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadNotes}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0B1F3A] hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Incident Summary (.txt)</span>
          </button>

          <p className="text-[11px] text-slate-500">
            These notes stay in your browser and are not uploaded or stored by MuleGuard.
          </p>
        </aside>
      </div>
    </div>
  );
}
