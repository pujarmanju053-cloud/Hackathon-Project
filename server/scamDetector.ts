import { GoogleGenAI, Type } from '@google/genai';
import type {
  ManipulationAxis,
  MessageAnalysisResult,
  RiskEngineConfig,
  RiskFactor,
  ScamProgressionStage,
} from '../src/types.ts';
import { classifyRiskLevel, DEFAULT_RISK_CONFIG } from './riskEngine.ts';

interface RuleMatch {
  id: string;
  label: string;
  category: string;
  points: number;
  weight: number;
  patterns: RegExp[];
  detail: string;
  redFlag: string;
}

const SCAM_RULES: RuleMatch[] = [
  {
    id: 'mule-forwarding',
    label: 'Personal Account Payment Forwarding Request',
    category: 'Money Mule Job Recruitment',
    points: 42,
    weight: 35,
    patterns: [
      /receiv(e|ing)\s+(and|&)?\s*(forward|transfer|send)/i,
      /use\s+(your|personal)\s+(bank\s+)?account/i,
      /forward\s+(money|funds|payments?|amount)/i,
      /commission\s+(per|on\s+every)\s+(transfer|transaction|payment)/i,
      /rent\s+(your\s+)?(bank\s+)?account/i,
      /receive\s+payment.*send\s+to/i,
    ],
    detail: 'Asks the user to receive funds into a personal bank account and forward them onward for a commission—a classic money mule recruitment pattern.',
    redFlag: 'Request to receive and forward money using your personal bank account',
  },
  {
    id: 'fake-wfh-income',
    label: 'Unrealistic Work-From-Home Earnings Offer',
    category: 'Fake Work-From-Home Job Offer',
    points: 26,
    weight: 22,
    patterns: [
      /earn\s*(₹|rs\.?|inr)?\s*\d[\d,]*\s*(per\s+day|daily|weekly)/i,
      /work\s*from\s*home.*(daily|no\s+experience|part[\s-]time)/i,
      /part[\s-]time\s+job.*(telegram|whatsapp|daily\s+income)/i,
      /guaranteed\s+(daily\s+)?income/i,
      /no\s+interview.*hiring/i,
    ],
    detail: 'Promises unusually high daily pay with no interview or skill requirements to attract students and job seekers.',
    redFlag: 'Unrealistic daily income promise with zero qualification check',
  },
  {
    id: 'registration-fee',
    label: 'Upfront Registration or Security Deposit Fee',
    category: 'Advance-Fee Job Scam',
    points: 28,
    weight: 24,
    patterns: [
      /(registration|joining|training|id\s*card|kit|processing)\s*(fee|charge|deposit)/i,
      /pay\s*(₹|rs\.?|inr)?\s*\d+.*(confirm|activate|join|unlock)/i,
      /refundable\s+(security\s+)?deposit/i,
    ],
    detail: 'Legitimate employers never ask candidates to pay registration or security fees before starting work.',
    redFlag: 'Upfront registration, deposit, or activation fee requested',
  },
  {
    id: 'credential-harvest',
    label: 'OTP, PIN, or Password Request',
    category: 'Credential & Account Takeover Scam',
    points: 45,
    weight: 38,
    patterns: [
      /\b(share|send|enter|verify|tell)\b.*\b(otp|pin|mpin|upi\s*pin|cvv|password|atm\s*pin)\b/i,
      /\b(otp|upi\s*pin|mpin)\b.*(required|mandatory|verify|update)/i,
    ],
    detail: 'Directly or indirectly asks for secret banking codes (OTP, UPI PIN, ATM PIN, or password).',
    redFlag: 'Requests confidential OTP, UPI PIN, or banking password',
  },
  {
    id: 'fake-kyc-suspension',
    label: 'Urgent KYC Expiry or Account Suspension Threat',
    category: 'Fake KYC / Bank Impersonation',
    points: 34,
    weight: 28,
    patterns: [
      /\b(kyc|pan|aadhaar)\b.*(update|expired|pending|suspend|block|freeze)/i,
      /account\s*(will\s*be\s*)?(blocked|suspended|frozen|closed)\s*(today|within|in\s*\d+\s*hours?)/i,
      /reactivate\s+(your\s+)?(account|yono|upi)/i,
    ],
    detail: 'Uses fear of sudden bank account suspension to pressure the user into clicking an unverified KYC link.',
    redFlag: 'Threatens immediate account freeze or urgent KYC update',
  },
  {
    id: 'fake-lottery-reward',
    label: 'Unexpected Reward, Cashback, or Lottery Claim',
    category: 'Fake Reward & Cashback Scam',
    points: 30,
    weight: 25,
    patterns: [
      /\b(won|winner|prize|lottery|lucky\s*draw|jackpot|cashback\s*reward)\b/i,
      /claim\s+(your\s+)?(₹|rs\.?|inr)?\s*\d+/i,
      /approve\s+collect\s+request/i,
      /scan\s+qr\s+to\s+receive/i,
    ],
    detail: 'Lures the user with unexpected prize money or asks them to enter a UPI PIN / approve a collect request to "receive" cash.',
    redFlag: 'Unsolicited prize, lottery, or QR/collect request to receive money',
  },
  {
    id: 'suspicious-links',
    label: 'Unverified Shortened or Lookalike Link',
    category: 'Phishing Link Alert',
    points: 22,
    weight: 18,
    patterns: [
      /https?:\/\/(bit\.ly|tinyurl\.com|t\.co|rb\.gy|shorturl|cutt\.ly)/i,
      /https?:\/\/[^\s]*\.(xyz|top|tk|ml|click|info|club|buzz)\b/i,
      /https?:\/\/[^\s]*(kyc|verify|sbi-?online|bank-?update|upi-?reward)[^\s]*/i,
      /wa\.me\/\d+|t\.me\/[a-zA-Z0-9_]+/i,
    ],
    detail: 'Contains shortened links, suspicious domains, or redirects to private messaging apps.',
    redFlag: 'Contains unverified shortlink, lookalike domain, or Telegram/WhatsApp redirect',
  },
];

function computeManipulationRadar(message: string): ManipulationAxis[] {
  const lower = message.toLowerCase();

  const evalAxis = (
    axis: ManipulationAxis['axis'],
    checks: Array<{ regex: RegExp; label: string; boost: number }>,
    explanation: string,
  ): ManipulationAxis => {
    let score = 8;
    const matchedSignals: string[] = [];
    for (const item of checks) {
      if (item.regex.test(lower)) {
        score += item.boost;
        matchedSignals.push(item.label);
      }
    }
    return {
      axis,
      score: Math.min(100, score),
      matchedSignals,
      explanation,
    };
  };

  return [
    evalAxis(
      'Fear',
      [
        { regex: /block(ed)?|suspend(ed)?|freeze|frozen|legal|police|penalty/i, label: 'Account freeze or legal threat', boost: 45 },
        { regex: /deactivat|terminat|closed/i, label: 'Permanent closure warning', boost: 35 },
      ],
      'Creates panic about losing access to your bank savings or facing penalties so you act before verifying.',
    ),
    evalAxis(
      'Urgency',
      [
        { regex: /today|immediately|urgent|within\s*\d+\s*(min|hour|hr)|now|last\s*chance|limited\s*slot/i, label: 'Strict countdown or immediate deadline', boost: 45 },
        { regex: /hurry|fast|quick|expire/i, label: 'Time-pressure phrasing', boost: 30 },
      ],
      'Forces a rushed decision within minutes or hours so you do not consult family or your bank branch.',
    ),
    evalAxis(
      'Greed',
      [
        { regex: /earn\s*(₹|rs\.?|inr)?\s*\d+|commission|easy\s*money|daily\s*income|profit/i, label: 'High effortless income claim', boost: 45 },
        { regex: /part[\s-]time|work\s*from\s*home|zero\s*investment/i, label: 'Zero-effort earnings appeal', boost: 30 },
      ],
      'Targets financial need with unusually high daily payouts or commission for simple forwarding tasks.',
    ),
    evalAxis(
      'Trust Manipulation',
      [
        { regex: /trusted|verified|100%\s*safe|guaranteed|no\s*risk|dear\s*(customer|user|candidate)/i, label: 'False reassurance phrases', boost: 35 },
        { regex: /hr\s+manager|mentor|team\s+leader|helpdesk/i, label: 'Friendly helper persona', boost: 35 },
      ],
      'Uses polite greetings and fake safety assurances to lower your natural caution.',
    ),
    evalAxis(
      'Authority Impersonation',
      [
        { regex: /\b(sbi|rbi|npci|upi|bank\s+manager|govt|government|income\s+tax|cyber\s+cell|kyc\s+desk)\b/i, label: 'Bank or regulator name-dropping', boost: 50 },
        { regex: /official\s+(notice|alert|department|portal)/i, label: 'Official notice framing', boost: 30 },
      ],
      'Pretends to speak on behalf of a trusted bank, regulator, or government department to demand compliance.',
    ),
    evalAxis(
      'Reward Temptation',
      [
        { regex: /bonus|cashback|prize|lottery|winner|gift|voucher|free/i, label: 'Cashback or prize bait', boost: 50 },
        { regex: /congratulations|selected|shortlisted/i, label: 'Special selection flattery', boost: 30 },
      ],
      'Uses unexpected prizes, bonuses, or "shortlisted" announcements to trigger excitement and compliance.',
    ),
  ];
}

function buildScamFutureLab(category: string, riskScore: number): ScamProgressionStage[] {
  if (riskScore <= 30) {
    return [
      {
        stage: 1,
        title: 'Stage 1 – Initial Contact',
        summary: 'Routine informational message with no detected money-forwarding or secret-code demands.',
        warningSign: 'Watch out only if a follow-up message later asks for OTPs or urgent links.',
        safeAction: 'Confirm any transaction directly inside your official banking app or kiosk passbook.',
      },
      {
        stage: 2,
        title: 'Stage 2 – Verification Check',
        summary: 'Legitimate alerts simply inform you; they never push you into rushed transfers.',
        warningSign: 'Sudden tone shifts toward urgency or prize claims indicate a spoofed thread.',
        safeAction: 'Keep your PIN, OTP, and password private at all times.',
      },
      {
        stage: 3,
        title: 'Stage 3 – Boundary Protection',
        summary: 'Never use your personal bank account to hold or move funds for strangers.',
        warningSign: 'Requests to forward payments for a small fee are a primary mule trap.',
        safeAction: 'Decline any third-party transfer request immediately.',
      },
      {
        stage: 4,
        title: 'Stage 4 – Safe Outcome',
        summary: 'By verifying independently and never sharing credentials, your account stays protected.',
        warningSign: 'Stay alert for lookalike sender numbers in future messages.',
        safeAction: 'Continue using official kiosk branches and verified apps.',
      },
    ];
  }

  if (category.includes('Mule') || category.includes('Work-From-Home') || category.includes('Job')) {
    return [
      {
        stage: 1,
        title: 'Stage 1 – Initial Contact',
        summary: 'A recruiter or "HR coordinator" sends a friendly part-time job offer promising ₹2,000–₹3,000 per day from home.',
        warningSign: 'High pay promised with no formal interview, company registration, or skill check.',
        safeAction: 'Verify the company on official job portals and never trust unsolicited WhatsApp/Telegram offers.',
      },
      {
        stage: 2,
        title: 'Stage 2 – Trust Building or Urgency',
        summary: 'They send fake ID cards, small initial "test" payouts, or claim slots are closing today to earn your trust.',
        warningSign: 'Pressure to join a private Telegram group or pay a "registration/kit fee" right away.',
        safeAction: 'Stop communicating if they push for speed or secrecy.',
      },
      {
        stage: 3,
        title: 'Stage 3 – Request for Money, OTP, Account Access, or Transfers',
        summary: 'They ask you to receive payments from "clients" into your account and forward 90–95% to other UPI IDs, keeping 5% commission.',
        warningSign: 'Incoming deposits from multiple unknown people followed by urgent forwarding instructions.',
        safeAction: 'Refuse to receive or forward any unknown funds. Never share bank login, OTP, or ATM card details.',
      },
      {
        stage: 4,
        title: 'Stage 4 – Possible Financial or Account Consequences',
        summary: 'If the incoming money came from cyber fraud victims, banks and law enforcement may place a lien/freeze on your account while the real scammer disappears.',
        warningSign: 'Sudden bank account debit freeze, cyber-complaint lien amount, or loss of your own savings.',
        safeAction: 'If you already transferred funds, stop immediately, contact your bank, and call 1930.',
      },
    ];
  }

  return [
    {
      stage: 1,
      title: 'Stage 1 – Initial Contact',
      summary: 'An SMS or message impersonates a bank, KYC desk, or reward program to grab your attention.',
      warningSign: 'Unofficial mobile numbers, shortened URLs, or spelling mistakes in bank names.',
      safeAction: 'Do not tap links in SMS or WhatsApp messages claiming urgent account issues.',
    },
    {
      stage: 2,
      title: 'Stage 2 – Trust Building or Urgency',
      summary: 'The message warns your account will be frozen in hours or a cashback reward will expire tonight.',
      warningSign: 'Artificial countdowns designed to stop you from calling your bank branch.',
      safeAction: 'Pause and check your account status directly via your official banking app or kiosk.',
    },
    {
      stage: 3,
      title: 'Stage 3 – Request for Money, OTP, Account Access, or Transfers',
      summary: 'A lookalike webpage or caller asks for your OTP, UPI PIN, screen-sharing app, or a small "verification transfer".',
      warningSign: 'Remember: you NEVER need to enter your UPI PIN or share an OTP to receive money or update KYC.',
      safeAction: 'Close the page, hang up immediately, and never approve unknown UPI collect requests.',
    },
    {
      stage: 4,
      title: 'Stage 4 – Possible Financial or Account Consequences',
      summary: 'Fraudsters can drain your account balance or misuse your credentials to route stolen funds through your account.',
      warningSign: 'Unauthorized debit alerts or unfamiliar OTP messages.',
      safeAction: 'Call your bank helpline, freeze compromised cards/UPI, and report at cybercrime.gov.in or 1930.',
    },
  ];
}

function buildDeterministicExplanation(
  scamCategory: string,
  redFlags: string[],
  riskScore: number,
): { explanation: string; nextSteps: string[] } {
  if (riskScore <= 30) {
    return {
      explanation:
        'This message does not show strong signs of a money mule recruitment offer or credential phishing scam. However, always double-check unexpected payment requests directly inside your official banking app.',
      nextSteps: [
        'Verify the sender if you do not recognize the phone number.',
        'Never share OTPs, UPI PINs, or passwords with anyone.',
        'If anyone later asks you to receive and forward money, stop immediately.',
      ],
    };
  }

  if (scamCategory.includes('Mule') || scamCategory.includes('Work-From-Home') || scamCategory.includes('Job')) {
    return {
      explanation:
        `This message shows strong signs of a ${scamCategory.toLowerCase()}. Scammers lure students and job seekers with easy daily earnings, then use their personal bank accounts to move stolen money. Even if they call it "payment processing" or "task commission," forwarding unknown funds can freeze your bank account.`,
      nextSteps: [
        'Do not share your bank account number, UPI ID, or Aadhaar/PAN details with this sender.',
        'Never receive money from strangers and forward it onward for a commission.',
        'Block the sender and warn friends or classmates if this offer is circulating in student groups.',
      ],
    };
  }

  return {
    explanation:
      `This message triggers ${redFlags.length || 1} major scam warning(s) under ${scamCategory}. Fraudsters use urgent threats or fake rewards to make you click unverified links or enter confidential banking codes before you have time to verify.`,
    nextSteps: [
      'Do not click any links, scan QR codes, or download apps mentioned in this message.',
      'Never enter your OTP, ATM PIN, or UPI PIN to claim a reward or "unblock" KYC.',
      'Visit your nearest bank branch or kiosk or call the official customer care number printed on your passbook.',
    ],
  };
}

let cachedAi: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  if (!cachedAi) {
    cachedAi = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedAi;
}

async function fetchGeminiExplanation(params: {
  message: string;
  channel: string;
  deterministicScore: number;
  scamCategory: string;
  redFlags: string[];
}): Promise<{
  simpleExplanation: string;
  recommendedNextSteps: string[];
  aiEnhanced: boolean;
  aiStatusNote: string;
}> {
  const fallback = buildDeterministicExplanation(
    params.scamCategory,
    params.redFlags,
    params.deterministicScore,
  );

  const ai = getGeminiClient();
  if (!ai) {
    return {
      simpleExplanation: fallback.explanation,
      recommendedNextSteps: fallback.nextSteps,
      aiEnhanced: false,
      aiStatusNote:
        'Deterministic rule analysis active. Configure GEMINI_API_KEY in Secrets to enable Gemini contextual explanations.',
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Analyze this message received via ${params.channel} for a first-time digital banking / kiosk user in India.
Message: """${params.message}"""
Deterministic rule score: ${params.deterministicScore}/100
Detected category: ${params.scamCategory}
Red flags found: ${params.redFlags.join('; ') || 'None'}

Write a warm, clear, non-accusatory explanation in simple English (max 65 words) explaining WHY this message is safe or risky, plus 3 practical, concrete next steps for the user.`,
      config: {
        systemInstruction:
          'You are MuleGuard, a protective, calm financial safety educator helping students and kiosk banking users avoid money mule scams and UPI fraud. Never accuse the user of crime. Never request OTPs, PINs, or passwords. Keep language simple and accessible.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            simpleExplanation: {
              type: Type.STRING,
              description: 'Plain-English explanation under 65 words.',
            },
            recommendedNextSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 concise actionable safety steps.',
            },
          },
          required: ['simpleExplanation', 'recommendedNextSteps'],
        },
      },
    });

    const raw = (response.text ?? '').trim();
    if (!raw) {
      throw new Error('Empty response from Gemini');
    }
    const parsed = JSON.parse(raw) as {
      simpleExplanation?: string;
      recommendedNextSteps?: string[];
    };

    if (
      typeof parsed.simpleExplanation === 'string' &&
      parsed.simpleExplanation.length > 10 &&
      Array.isArray(parsed.recommendedNextSteps) &&
      parsed.recommendedNextSteps.length > 0
    ) {
      return {
        simpleExplanation: parsed.simpleExplanation,
        recommendedNextSteps: parsed.recommendedNextSteps.slice(0, 4),
        aiEnhanced: true,
        aiStatusNote: 'Contextual explanation generated by Gemini AI alongside transparent rule scoring.',
      };
    }

    throw new Error('Malformed structured JSON from Gemini');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI service unavailable';
    return {
      simpleExplanation: fallback.explanation,
      recommendedNextSteps: fallback.nextSteps,
      aiEnhanced: false,
      aiStatusNote: `Deterministic rule explanation shown (AI service fallback: ${msg}).`,
    };
  }
}

export async function analyzeMessage(
  input: {
    message: string;
    channel?: string;
    id?: string;
    analyzedAt?: string;
    isDemo?: boolean;
    skipAi?: boolean;
  },
  riskConfig: RiskEngineConfig = DEFAULT_RISK_CONFIG,
): Promise<MessageAnalysisResult> {
  const cleanMessage = input.message.trim();
  const channel = input.channel?.trim() || 'SMS / WhatsApp';

  const matchedFactors: RiskFactor[] = [];
  const redFlags: string[] = [];
  let primaryCategory = 'General Communication';
  let topPoints = 0;

  for (const rule of SCAM_RULES) {
    const hit = rule.patterns.some((re) => re.test(cleanMessage));
    if (hit) {
      matchedFactors.push({
        id: rule.id,
        label: rule.label,
        weight: rule.weight,
        points: rule.points,
        detail: rule.detail,
      });
      redFlags.push(rule.redFlag);
      if (rule.points > topPoints) {
        topPoints = rule.points;
        primaryCategory = rule.category;
      }
    }
  }

  // Additional subtle heuristic for urgency + money amounts
  const hasAmount = /(₹|rs\.?|inr)\s*\d[\d,]*/i.test(cleanMessage);
  const hasUrgency = /(urgent|immediately|today|within\s*\d+\s*hours?|last\s*chance)/i.test(cleanMessage);
  if (hasAmount && hasUrgency && matchedFactors.length > 0) {
    matchedFactors.push({
      id: 'urgency-money-combo',
      label: 'Time-Pressured Financial Action',
      weight: 15,
      points: 14,
      detail: 'Combines specific rupee amounts with urgent deadline pressure to discourage verification.',
    });
  }

  // Cap score cleanly at 98 so deterministic rules leave clear room for nuance
  const rawSum = matchedFactors.reduce((sum, f) => sum + f.points, 0);
  const riskScore = matchedFactors.length === 0 ? 6 : Math.min(98, Math.max(12, rawSum));
  const riskLevel = classifyRiskLevel(riskScore, riskConfig);

  const topReasons =
    matchedFactors.length > 0
      ? [...matchedFactors].sort((a, b) => b.points - a.points).slice(0, 3)
      : [
          {
            id: 'no-scam-patterns',
            label: 'No Known Scam Indicators Found',
            weight: 100,
            points: 6,
            detail: 'No payment-forwarding, OTP request, fake KYC threat, or suspicious shortlinks were detected.',
          },
        ];

  const manipulationRadar = computeManipulationRadar(cleanMessage);
  const scamFutureLab = buildScamFutureLab(primaryCategory, riskScore);

  const aiOutcome = input.skipAi
    ? (() => {
        const det = buildDeterministicExplanation(primaryCategory, redFlags, riskScore);
        return {
          simpleExplanation: det.explanation,
          recommendedNextSteps: det.nextSteps,
          aiEnhanced: false,
          aiStatusNote: 'Simulated demo scan result using deterministic rule scoring.',
        };
      })()
    : await fetchGeminiExplanation({
        message: cleanMessage,
        channel,
        deterministicScore: riskScore,
        scamCategory: primaryCategory,
        redFlags,
      });

  return {
    id: input.id ?? `SCN-${Date.now().toString(36).toUpperCase()}`,
    message: cleanMessage,
    channel,
    analyzedAt: input.analyzedAt ?? new Date().toISOString(),
    riskScore,
    riskLevel,
    scamCategory: riskScore <= 30 ? 'Safe / Informational' : primaryCategory,
    detectedRedFlags: redFlags,
    topReasons,
    simpleExplanation: aiOutcome.simpleExplanation,
    recommendedNextSteps: aiOutcome.recommendedNextSteps,
    manipulationRadar,
    scamFutureLab,
    aiEnhanced: aiOutcome.aiEnhanced,
    aiStatusNote: aiOutcome.aiStatusNote,
    isDemo: input.isDemo ?? false,
  };
}
