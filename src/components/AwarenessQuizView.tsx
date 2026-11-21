import { useState } from 'react';
import { BookOpen, CheckCircle2, HelpCircle, RotateCcw, XCircle } from 'lucide-react';

const LEARNING_TOPICS = [
  {
    title: '1. What is a money mule?',
    body: 'A money mule is someone whose bank account or UPI is used to receive and forward stolen money on behalf of fraudsters. Even if you did not steal the money yourself, receiving unknown funds and sending them onward makes your account part of the fraud trail.',
  },
  {
    title: '2. How fake work-from-home job scams work',
    body: 'Scammers post offers like "Earn ₹3,000 daily by processing client payments from home." They ask for a small registration fee or tell you to receive UPI transfers in your personal account and forward 95% to another account while keeping 5%.',
  },
  {
    title: '3. Why receiving and forwarding unknown money is dangerous',
    body: 'When the real victim reports the scam to 1930, police and banks trace the first account that received the money—yours. Your bank account can be frozen with a cyber-crime lien, blocking your scholarship, salary, and personal savings.',
  },
  {
    title: '4. Common UPI scams to watch out for',
    body: 'Fraudsters send "Collect Money" requests disguised as cashback prizes, or send QR codes saying "Scan to receive ₹5,000." Remember: you ONLY enter your UPI PIN when sending money—never to receive money.',
  },
  {
    title: '5. OTP and PIN safety',
    body: 'No bank officer, SBI kiosk agent, RBI official, or employer will ever ask for your OTP, ATM PIN, UPI PIN, or net-banking password—not even to "update KYC" or "cancel a wrong transfer."',
  },
  {
    title: '6. How to identify fake recruitment offers',
    body: 'Red flags include: no formal interview, instant hiring over WhatsApp or Telegram, requests for upfront kit/registration fees, and any task involving moving money through your personal savings account.',
  },
];

const REALISTIC_EXAMPLES = [
  {
    title: 'The "Payment Coordinator" Trap',
    example:
      '"Hi, our e-commerce company needs part-time helpers. We will transfer ₹20,000 to your SBI account; keep ₹1,000 commission and send ₹19,000 to our vendor UPI."',
    whyDangerous:
      'The ₹20,000 actually comes from another scam victim. You lose ₹19,000 and your bank account gets frozen.',
  },
  {
    title: 'The "KYC Account Block" SMS',
    example:
      '"Dear user, your PAN/KYC is pending. Account will freeze in 2 hours. Click http://kyc-verify-now.xyz and enter OTP."',
    whyDangerous:
      'Banks never ask for KYC verification via random shortlinks or ask you to type OTPs on external websites.',
  },
];

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question:
      'A stranger on Telegram offers you ₹2,500/day to receive UPI payments in your personal account and forward them to another UPI ID. What should you do?',
    options: [
      'Accept it as an easy part-time job',
      'Refuse immediately—this is a money mule trap that can freeze your bank account',
      'Try it once with a small amount to see if it pays',
    ],
    correctIndex: 1,
    explanation:
      'Forwarding unknown funds through your personal account is the classic money mule trap. Even one transfer can trigger a bank lien or freeze.',
  },
  {
    id: 2,
    question: 'Do you ever need to enter your UPI PIN to RECEIVE prize money or a refund?',
    options: [
      'Yes, to confirm your bank account',
      'Only for amounts above ₹5,000',
      'No—you only enter your UPI PIN when money leaves your account',
    ],
    correctIndex: 2,
    explanation:
      'Entering a UPI PIN or approving a collect request always debits money from your account. Receiving money never requires your PIN.',
  },
  {
    id: 3,
    question:
      'You receive an SMS saying your bank account will be blocked in 2 hours unless you click a shortlink and share an OTP. What is the safest step?',
    options: [
      'Visit your official banking app or local kiosk branch directly without clicking the link',
      'Click the link quickly so your account stays active',
      'Reply to the SMS with your Aadhaar number',
    ],
    correctIndex: 0,
    explanation:
      'Urgent block threats with unofficial links are phishing scams. Always verify directly through your bank branch, kiosk, or official app.',
  },
  {
    id: 4,
    question:
      'An online HR recruiter says you are selected without an interview, but asks for a ₹499 refundable ID card fee before joining. Is this safe?',
    options: [
      'Yes, refundable fees are standard',
      'No—legitimate employers do not charge upfront fees to hire you',
      'Yes, if they send a photo of an ID badge on WhatsApp',
    ],
    correctIndex: 1,
    explanation:
      'Advance registration, kit, or ID fees are a top indicator of fake job scams. Scammers often share forged ID cards to build false trust.',
  },
  {
    id: 5,
    question:
      'If you realize you have already transferred money to a suspected fraudster in India, what number should you call immediately?',
    options: [
      'Wait 3 days to see if they refund it',
      'Call the national cyber fraud helpline 1930 and report at cybercrime.gov.in',
      'Post your bank account number on social media for help',
    ],
    correctIndex: 1,
    explanation:
      'Calling 1930 immediately helps authorities trace and freeze fraudulent accounts before the money is withdrawn.',
  },
  {
    id: 6,
    question:
      'Which transaction pattern most strongly suggests an account is being misused as a money mule?',
    options: [
      'One monthly scholarship credit followed by small grocery and electricity bill payments',
      'Multiple deposits from unknown senders followed within minutes by a large outgoing transfer leaving near-zero balance',
      'Paying a monthly bus pass at a local counter',
    ],
    correctIndex: 1,
    explanation:
      'Rapid pass-through transfers from multiple unknown senders leaving a near-zero balance are hallmark money mule patterns.',
  },
];

export function AwarenessQuizView() {
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const answeredCount = Object.keys(answers).length;
  const correctCount = QUIZ_QUESTIONS.filter(
    (q) => answers[q.id] === q.correctIndex,
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-teal-700">
          Fraud Awareness Center · Simple Safety Guide &amp; Interactive Quiz
        </p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">
          Understand money mule scams &amp; test your safety instincts
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Clear, everyday guidance designed for students, job seekers, and first-time kiosk banking users.
        </p>
      </div>

      {/* Learning Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {LEARNING_TOPICS.map((topic) => (
          <article
            key={topic.title}
            className="bg-white border border-slate-200 rounded-xl p-5 space-y-2"
          >
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-teal-700 shrink-0" aria-hidden="true" />
              <span>{topic.title}</span>
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">{topic.body}</p>
          </article>
        ))}
      </section>

      {/* Realistic Scam Examples */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h2 className="text-base font-semibold text-slate-900">
          Realistic Scam Examples to Recognize
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REALISTIC_EXAMPLES.map((item) => (
            <div
              key={item.title}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
            >
              <div className="text-sm font-semibold text-slate-900">{item.title}</div>
              <p className="text-xs sm:text-sm italic text-slate-700 bg-white border border-slate-200 rounded-lg p-3">
                {item.example}
              </p>
              <p className="text-xs text-red-700 font-medium">
                Why it is dangerous: {item.whyDangerous}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Quiz */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-teal-700" aria-hidden="true" />
              <span>Quick Fraud Safety Quiz</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select an answer for each question to see instant explanations
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold font-mono-tabular text-slate-900">
              Score: {correctCount} / {QUIZ_QUESTIONS.length}
              <span className="text-xs font-normal text-slate-500 ml-1.5">
                ({answeredCount} answered)
              </span>
            </span>
            {answeredCount > 0 && (
              <button
                type="button"
                onClick={() => setAnswers({})}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-800 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake</span>
              </button>
            )}
          </div>
        </div>

        <div className="space-y-5">
          {QUIZ_QUESTIONS.map((q) => {
            const picked = answers[q.id];
            const hasAnswered = typeof picked === 'number';
            const isCorrect = picked === q.correctIndex;

            return (
              <div
                key={q.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3"
              >
                <div className="text-sm font-semibold text-slate-900">
                  Q{q.id}. {q.question}
                </div>

                <div className="space-y-2">
                  {q.options.map((opt, idx) => {
                    const selected = picked === idx;
                    const rightOption = idx === q.correctIndex;
                    let cls =
                      'bg-white border-slate-200 hover:bg-slate-100 text-slate-800';
                    if (hasAnswered) {
                      if (rightOption) {
                        cls = 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium';
                      } else if (selected && !rightOption) {
                        cls = 'bg-red-50 border-red-300 text-red-900';
                      }
                    }

                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: idx }))}
                        className={`w-full text-left px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm transition-colors cursor-pointer ${cls}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {hasAnswered && (
                  <div
                    className={`flex items-start gap-2 text-xs p-3 rounded-lg border ${
                      isCorrect
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    {isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-semibold">
                        {isCorrect ? 'Correct: ' : 'Not quite: '}
                      </span>
                      {q.explanation}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
