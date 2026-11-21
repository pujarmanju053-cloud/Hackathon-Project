import type {
  AnalyzedTransaction,
  FlowEdge,
  FlowNode,
  RiskEngineConfig,
  RiskFactor,
  TransactionAnalysisSummary,
} from '../src/types.ts';
import { classifyRiskLevel, DEFAULT_RISK_CONFIG } from './riskEngine.ts';

export interface RawTransactionRow {
  id: string;
  timestamp: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  sender: string;
  receiver: string;
  balanceAfter: number;
  description: string;
}

export const SAMPLE_MULE_CSV = `id,timestamp,type,amount,sender,receiver,balance_after,description
TXN-9011,2026-11-20T09:10:00,CREDIT,4200,College Scholarship Cell,Kiosk A/C **4821,6450,Monthly stipend credit
TXN-9012,2026-11-20T11:32:00,DEBIT,650,Kiosk A/C **4821,FreshMart Kirana UPI,5800,Groceries and daily essentials
TXN-9013,2026-11-20T14:04:00,CREDIT,14800,Unknown Sender (98xx4120@ybl),Kiosk A/C **4821,20600,Task payout batch 1
TXN-9014,2026-11-20T14:11:00,DEBIT,14000,Kiosk A/C **4821,Merchant Hub 77@axl,6600,Commission forwarding transfer
TXN-9015,2026-11-20T16:18:00,CREDIT,9500,Unknown Sender (77xx9912@okicici),Kiosk A/C **4821,16100,Client settlement order
TXN-9016,2026-11-20T16:25:00,CREDIT,8200,Unknown Sender (81xx3305@paytm),Kiosk A/C **4821,24300,Client settlement order 2
TXN-9017,2026-11-20T16:29:00,CREDIT,6800,Unknown Sender (62xx7044@ybl),Kiosk A/C **4821,31100,Client settlement order 3
TXN-9018,2026-11-20T16:36:00,DEBIT,30950,Kiosk A/C **4821,Apex Digital Exchange@ibl,150,Bulk pass-through payout (near-zero balance)
TXN-9019,2026-11-20T23:42:00,CREDIT,18500,Unknown Sender (90xx1188@okaxis),Kiosk A/C **4821,18650,Late night deposit
TXN-9020,2026-11-20T23:51:00,DEBIT,18400,Kiosk A/C **4821,CryptoDesk Agent@ybl,250,Late night rapid forward
TXN-9021,2026-11-21T08:15:00,DEBIT,199,Kiosk A/C **4821,Jio Prepaid Recharge,51,Mobile recharge`;

export const SAMPLE_NORMAL_CSV = `id,timestamp,type,amount,sender,receiver,balance_after,description
TXN-8101,2026-11-19T10:05:00,CREDIT,8500,Part-Time Library Payroll,Kiosk A/C **4821,11200,Monthly stipend
TXN-8102,2026-11-19T13:20:00,DEBIT,420,Kiosk A/C **4821,Campus Canteen UPI,10780,Lunch and snacks
TXN-8103,2026-11-19T18:45:00,DEBIT,1250,Kiosk A/C **4821,State Electricity Board,9530,Home electricity bill
TXN-8104,2026-11-20T09:30:00,DEBIT,850,Kiosk A/C **4821,City Bus Pass Center,8680,Monthly bus pass
TXN-8105,2026-11-20T17:10:00,CREDIT,1500,Parents Family Transfer,Kiosk A/C **4821,10180,Book allowance
TXN-8106,2026-11-21T11:00:00,DEBIT,640,Kiosk A/C **4821,Vidya Book Depot,9540,Textbooks`;

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseTransactionCsv(csvText: string): RawTransactionRow[] {
  const lines = csvText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new Error('CSV must include a header row and at least one transaction row.');
  }

  const headers = splitCsvLine(lines[0]).map((h) =>
    h.toLowerCase().replace(/[^a-z0-9]/g, ''),
  );

  const findIndex = (candidates: string[]) =>
    headers.findIndex((h) => candidates.some((c) => h.includes(c)));

  const idxId = findIndex(['id', 'txid', 'transactionid', 'ref']);
  const idxTime = findIndex(['timestamp', 'time', 'date']);
  const idxType = findIndex(['type', 'direction', 'drcr']);
  const idxAmount = findIndex(['amount', 'amt', 'value']);
  const idxSender = findIndex(['sender', 'from', 'source']);
  const idxReceiver = findIndex(['receiver', 'to', 'destination', 'beneficiary']);
  const idxBalance = findIndex(['balance', 'balanceafter', 'closing']);
  const idxDesc = findIndex(['description', 'note', 'remark', 'narration']);

  if (idxAmount === -1 || idxType === -1) {
    throw new Error(
      'CSV requires at least "type" (CREDIT/DEBIT) and "amount" columns.',
    );
  }

  const rows: RawTransactionRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.every((c) => c === '')) continue;

    const rawAmount = (cols[idxAmount] ?? '0').replace(/[^0-9.-]/g, '');
    const amount = Number.parseFloat(rawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error(`Row ${i + 1}: Invalid transaction amount "${cols[idxAmount] ?? ''}".`);
    }

    const rawType = (cols[idxType] ?? '').toUpperCase();
    const type: 'CREDIT' | 'DEBIT' =
      rawType.includes('CR') || rawType.includes('IN') ? 'CREDIT' : 'DEBIT';

    const rawBal = idxBalance >= 0 ? (cols[idxBalance] ?? '0').replace(/[^0-9.-]/g, '') : '0';
    const balanceAfter = Number.isFinite(Number.parseFloat(rawBal))
      ? Number.parseFloat(rawBal)
      : 0;

    rows.push({
      id: (idxId >= 0 && cols[idxId]) || `TXN-${1000 + i}`,
      timestamp:
        (idxTime >= 0 && cols[idxTime]) ||
        new Date(Date.now() - (lines.length - i) * 3600_000).toISOString(),
      type,
      amount: Math.round(amount * 100) / 100,
      sender: (idxSender >= 0 && cols[idxSender]) || (type === 'CREDIT' ? 'Unknown Sender' : 'Kiosk Account'),
      receiver: (idxReceiver >= 0 && cols[idxReceiver]) || (type === 'DEBIT' ? 'External Recipient' : 'Kiosk Account'),
      balanceAfter,
      description: (idxDesc >= 0 && cols[idxDesc]) || 'UPI / Kiosk Transfer',
    });
  }

  if (rows.length === 0) {
    throw new Error('No valid transaction rows were parsed from the CSV.');
  }

  return rows;
}

function isUnknownSender(sender: string): boolean {
  return /unknown|stranger|unverified|@[a-z]+|\d{2}xx\d{2}/i.test(sender) &&
    !/payroll|scholarship|parents|family|salary|college/i.test(sender);
}

export function analyzeTransactions(
  rows: RawTransactionRow[],
  options: {
    datasetName?: string;
    isDemo?: boolean;
    riskConfig?: RiskEngineConfig;
  } = {},
): TransactionAnalysisSummary {
  const config = options.riskConfig ?? DEFAULT_RISK_CONFIG;
  const sorted = [...rows].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const uniqueUnknownSenders = new Set(
    sorted.filter((r) => r.type === 'CREDIT' && isUnknownSender(r.sender)).map((r) => r.sender),
  );

  const analyzed: AnalyzedTransaction[] = [];
  const patternCounter = new Map<string, number>();

  for (let i = 0; i < sorted.length; i++) {
    const tx = sorted[i];
    const txTime = new Date(tx.timestamp).getTime();
    const reasons: RiskFactor[] = [];
    const patterns: string[] = [];

    // 1. Rapid pass-through: incoming unknown credit followed within 45 min by debit >= 75% of amount
    if (tx.type === 'DEBIT') {
      const recentCredits = sorted.filter((prev) => {
        if (prev.type !== 'CREDIT') return false;
        const diffMin = (txTime - new Date(prev.timestamp).getTime()) / 60000;
        return diffMin >= 0 && diffMin <= 45;
      });

      const directMatch = recentCredits.find(
        (c) =>
          isUnknownSender(c.sender) &&
          tx.amount >= c.amount * 0.75 &&
          tx.amount <= c.amount * 1.15,
      );

      if (directMatch) {
        reasons.push({
          id: `passthrough-${tx.id}`,
          label: 'Rapid Pass-Through Forwarding',
          weight: 40,
          points: 44,
          detail: `₹${tx.amount.toLocaleString('en-IN')} sent shortly after receiving ₹${directMatch.amount.toLocaleString('en-IN')} from ${directMatch.sender}.`,
        });
        patterns.push('Rapid Pass-Through Transfer');
      }

      // 2. Smurfing / aggregation: >= 2 recent unknown credits summed up into 1 large debit
      const unknownRecentSum = recentCredits
        .filter((c) => isUnknownSender(c.sender))
        .reduce((s, c) => s + c.amount, 0);

      if (recentCredits.length >= 2 && unknownRecentSum >= tx.amount * 0.8 && tx.amount >= 15000) {
        reasons.push({
          id: `smurfing-${tx.id}`,
          label: 'Multiple Small Credits Aggregated Into One Payout',
          weight: 35,
          points: 38,
          detail: `${recentCredits.length} incoming transfers totaling ₹${unknownRecentSum.toLocaleString('en-IN')} combined into a single ₹${tx.amount.toLocaleString('en-IN')} transfer.`,
        });
        patterns.push('Smurfing / Fund Aggregation');
      }

      // 3. Near-zero balance drain after large transfer
      if (tx.amount >= 5000 && tx.balanceAfter >= 0 && tx.balanceAfter <= 500) {
        reasons.push({
          id: `nearzero-${tx.id}`,
          label: 'Near-Zero Balance After Transfer',
          weight: 20,
          points: 22,
          detail: `Account balance dropped to ₹${tx.balanceAfter.toLocaleString('en-IN')} immediately after sending ₹${tx.amount.toLocaleString('en-IN')}.`,
        });
        patterns.push('Near-Zero Balance Sweep');
      }
    }

    // 4. Unknown sender credit + multiple unknown senders burst
    if (tx.type === 'CREDIT' && isUnknownSender(tx.sender)) {
      reasons.push({
        id: `unknown-sender-${tx.id}`,
        label: 'Incoming Transfer From Unknown Sender',
        weight: 25,
        points: 26,
        detail: `Funds received from unverified external party (${tx.sender}).`,
      });
      patterns.push('Unknown Sender Credit');

      if (uniqueUnknownSenders.size >= 3) {
        reasons.push({
          id: `multi-unknown-${tx.id}`,
          label: 'Multiple Unrelated Senders Detected',
          weight: 25,
          points: 24,
          detail: `${uniqueUnknownSenders.size} distinct unknown senders sent funds to this single account.`,
        });
        patterns.push('Multiple Unknown Senders');
      }
    }

    // 5. Off-hour timing (11 PM - 5 AM) or forwarding keywords
    const hour = new Date(tx.timestamp).getHours();
    if (!Number.isNaN(hour) && (hour >= 22 || hour < 5) && tx.amount >= 5000) {
      reasons.push({
        id: `offhour-${tx.id}`,
        label: 'Late-Night High-Value Activity',
        weight: 15,
        points: 16,
        detail: `High-value transaction occurred at ${String(hour).padStart(2, '0')}:00 outside normal daytime kiosk hours.`,
      });
      patterns.push('Unusual Late-Night Timing');
    }

    if (/commission|forward|task|crypto|agent|settlement/i.test(tx.description)) {
      reasons.push({
        id: `keyword-${tx.id}`,
        label: 'Mule-Related Narration Keyword',
        weight: 15,
        points: 18,
        detail: `Transaction description ("${tx.description}") matches common task/forwarding scam narratives.`,
      });
    }

    const totalPoints = reasons.reduce((s, r) => s + r.points, 0);
    const riskScore = reasons.length === 0 ? 8 : Math.min(97, Math.max(12, totalPoints));
    const riskLevel = classifyRiskLevel(riskScore, config);
    const primaryPattern = patterns[0] ?? 'Normal Account Activity';

    if (riskLevel !== 'Low Risk') {
      for (const p of patterns) {
        patternCounter.set(p, (patternCounter.get(p) ?? 0) + 1);
      }
    }

    analyzed.push({
      ...tx,
      suspiciousPattern: primaryPattern,
      riskScore,
      riskLevel,
      topReasons:
        reasons.length > 0
          ? [...reasons].sort((a, b) => b.points - a.points).slice(0, 3)
          : [
              {
                id: `normal-${tx.id}`,
                label: 'Consistent With Regular Kiosk Usage',
                weight: 100,
                points: 8,
                detail: 'Amount, counterparty, and timing match standard personal banking behavior.',
              },
            ],
      isMuleSuspect: riskScore > config.lowThresholdMax,
    });
  }

  const totalIncoming = analyzed
    .filter((t) => t.type === 'CREDIT')
    .reduce((s, t) => s + t.amount, 0);
  const totalOutgoing = analyzed
    .filter((t) => t.type === 'DEBIT')
    .reduce((s, t) => s + t.amount, 0);

  const suspiciousCount = analyzed.filter((t) => t.riskLevel !== 'Low Risk').length;
  const highRiskCount = analyzed.filter((t) => t.riskLevel === 'High Risk').length;

  const avgTopScore =
    analyzed.length > 0
      ? Math.round(
          [...analyzed]
            .sort((a, b) => b.riskScore - a.riskScore)
            .slice(0, Math.min(4, analyzed.length))
            .reduce((s, t) => s + t.riskScore, 0) / Math.min(4, analyzed.length),
        )
      : 0;

  const overallMuleRiskScore = suspiciousCount === 0 ? 10 : Math.min(96, avgTopScore);
  const overallRiskLevel = classifyRiskLevel(overallMuleRiskScore, config);

  // Build flow diagram nodes & edges
  const nodeMap = new Map<string, FlowNode>();
  const kioskId = 'KIOSK-USER-ACCOUNT';
  nodeMap.set(kioskId, {
    id: kioskId,
    label: 'User Kiosk Account',
    role: 'kiosk_account',
    totalAmount: totalIncoming + totalOutgoing,
    txCount: analyzed.length,
    riskLevel: overallRiskLevel,
  });

  const flowEdges: FlowEdge[] = [];
  for (const tx of analyzed) {
    if (tx.type === 'CREDIT') {
      const existing = nodeMap.get(tx.sender);
      if (existing) {
        existing.totalAmount += tx.amount;
        existing.txCount += 1;
        if (tx.riskScore > 70) existing.riskLevel = 'High Risk';
      } else {
        nodeMap.set(tx.sender, {
          id: tx.sender,
          label: tx.sender,
          role: 'source',
          totalAmount: tx.amount,
          txCount: 1,
          riskLevel: tx.riskLevel,
        });
      }
      flowEdges.push({
        from: tx.sender,
        to: kioskId,
        amount: tx.amount,
        txId: tx.id,
        flagged: tx.riskLevel !== 'Low Risk',
        note: tx.suspiciousPattern,
      });
    } else {
      const existing = nodeMap.get(tx.receiver);
      if (existing) {
        existing.totalAmount += tx.amount;
        existing.txCount += 1;
        if (tx.riskScore > 70) existing.riskLevel = 'High Risk';
      } else {
        nodeMap.set(tx.receiver, {
          id: tx.receiver,
          label: tx.receiver,
          role: 'destination',
          totalAmount: tx.amount,
          txCount: 1,
          riskLevel: tx.riskLevel,
        });
      }
      flowEdges.push({
        from: kioskId,
        to: tx.receiver,
        amount: tx.amount,
        txId: tx.id,
        flagged: tx.riskLevel !== 'Low Risk',
        note: tx.suspiciousPattern,
      });
    }
  }

  // Group into chart buckets (by date or sequential batches of 2-3 txns)
  const bucketMap = new Map<
    string,
    { label: string; incoming: number; outgoing: number; suspicious: number; normal: number }
  >();
  for (const tx of analyzed) {
    const d = new Date(tx.timestamp);
    const label = Number.isNaN(d.getTime())
      ? tx.timestamp.slice(0, 10)
      : `${String(d.getHours()).padStart(2, '0')}:00`;
    const bucket = bucketMap.get(label) ?? {
      label,
      incoming: 0,
      outgoing: 0,
      suspicious: 0,
      normal: 0,
    };
    if (tx.type === 'CREDIT') bucket.incoming += tx.amount;
    else bucket.outgoing += tx.amount;
    if (tx.riskLevel === 'Low Risk') bucket.normal += 1;
    else bucket.suspicious += 1;
    bucketMap.set(label, bucket);
  }

  const allReasons = analyzed
    .flatMap((t) => t.topReasons)
    .filter((r) => r.points > 10)
    .sort((a, b) => b.points - a.points);

  const uniqueReasons: RiskFactor[] = [];
  const seenLabels = new Set<string>();
  for (const r of allReasons) {
    if (!seenLabels.has(r.label)) {
      seenLabels.add(r.label);
      uniqueReasons.push(r);
    }
    if (uniqueReasons.length >= 3) break;
  }

  return {
    datasetName: options.datasetName ?? 'Simulated Kiosk Ledger',
    analyzedAt: new Date().toISOString(),
    totalTransactions: analyzed.length,
    suspiciousCount,
    highRiskCount,
    totalIncoming,
    totalOutgoing,
    overallMuleRiskScore,
    overallRiskLevel,
    topPatterns: [...patternCounter.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([pattern]) => pattern),
    topReasons:
      uniqueReasons.length > 0
        ? uniqueReasons
        : [
            {
              id: 'clean-ledger',
              label: 'Normal Personal Banking Pattern',
              weight: 100,
              points: 10,
              detail: 'No rapid pass-through or smurfing indicators detected in this dataset.',
            },
          ],
    transactions: analyzed,
    flowNodes: [...nodeMap.values()],
    flowEdges,
    timeSeries: [...bucketMap.values()],
    riskDistribution: {
      low: analyzed.filter((t) => t.riskLevel === 'Low Risk').length,
      medium: analyzed.filter((t) => t.riskLevel === 'Medium Risk').length,
      high: analyzed.filter((t) => t.riskLevel === 'High Risk').length,
    },
    isDemo: options.isDemo ?? false,
  };
}
