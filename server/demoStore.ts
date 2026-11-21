import type {
  DashboardPayload,
  FraudAlert,
  MessageAnalysisResult,
  RiskEngineConfig,
  TransactionAnalysisSummary,
} from '../src/types.ts';
import { DEFAULT_RISK_CONFIG, classifyRiskLevel } from './riskEngine.ts';
import { analyzeMessage } from './scamDetector.ts';
import {
  SAMPLE_MULE_CSV,
  analyzeTransactions,
  parseTransactionCsv,
} from './transactionAnalyzer.ts';

class DemoStore {
  public riskConfig: RiskEngineConfig = { ...DEFAULT_RISK_CONFIG };
  public scans: MessageAnalysisResult[] = [];
  public alerts: FraudAlert[] = [];
  public transactionSummary!: TransactionAnalysisSummary;
  private initialized = false;

  public async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    const demoMessages = [
      {
        id: 'SCN-DEMO-101',
        channel: 'WhatsApp Job Offer',
        analyzedAt: '2026-11-21T05:40:00.000Z',
        message:
          'Earn ₹3,000 per day from home! Part-time payment coordinator needed. Use your personal bank account to receive client payments and forward to our merchant UPI within 15 minutes for 5% commission. Pay ₹499 registration fee to start today: https://bit.ly/wfh-fast-pay',
      },
      {
        id: 'SCN-DEMO-102',
        channel: 'SMS Alert',
        analyzedAt: '2026-11-21T04:15:00.000Z',
        message:
          'URGENT: Dear customer, your bank KYC is expired. Your account will be blocked today within 2 hours. Update PAN and verify OTP immediately at http://sbi-kyc-update-now.xyz',
      },
      {
        id: 'SCN-DEMO-103',
        channel: 'Telegram Message',
        analyzedAt: '2026-11-20T18:20:00.000Z',
        message:
          'Congratulations! You won ₹25,000 Diwali UPI cashback reward! Approve the collect request and enter your UPI PIN to receive prize money immediately.',
      },
      {
        id: 'SCN-DEMO-104',
        channel: 'Bank SMS',
        analyzedAt: '2026-11-20T09:12:00.000Z',
        message:
          'INR 4,200.00 credited to your Kiosk A/C XX4821 on 20-11-26 via NEFT Scholarship Cell. Available balance: INR 6,450.00.',
      },
    ];

    for (const item of demoMessages) {
      const result = await analyzeMessage(
        {
          id: item.id,
          message: item.message,
          channel: item.channel,
          analyzedAt: item.analyzedAt,
          isDemo: true,
          skipAi: true,
        },
        this.riskConfig,
      );
      this.scans.push(result);
    }

    const rows = parseTransactionCsv(SAMPLE_MULE_CSV);
    this.transactionSummary = analyzeTransactions(rows, {
      datasetName: 'Simulated Kiosk Student Ledger (Demo)',
      isDemo: true,
      riskConfig: this.riskConfig,
    });

    this.alerts = [
      {
        id: 'ALT-4091',
        severity: 'High',
        createdAt: '2026-11-20T16:36:00.000Z',
        reason: 'Rapid pass-through & smurfing aggregation detected (₹30,950)',
        explanation:
          'Three incoming transfers from unknown UPI IDs were aggregated and forwarded within 18 minutes, leaving a near-zero balance of ₹150.',
        relatedTransactionId: 'TXN-9018',
        relatedScanId: null,
        riskScore: 92,
        status: 'New',
        sourceType: 'Transaction Pattern',
        isDemo: true,
      },
      {
        id: 'ALT-4090',
        severity: 'High',
        createdAt: '2026-11-21T05:40:00.000Z',
        reason: 'Money mule job recruitment message detected',
        explanation:
          'Message asks to receive payments into a personal account and forward them for a 5% commission, plus demands a ₹499 registration fee.',
        relatedTransactionId: null,
        relatedScanId: 'SCN-DEMO-101',
        riskScore: 96,
        status: 'New',
        sourceType: 'Message Scan',
        isDemo: true,
      },
      {
        id: 'ALT-4089',
        severity: 'High',
        createdAt: '2026-11-20T23:51:00.000Z',
        reason: 'Late-night rapid pass-through transfer (₹18,400)',
        explanation:
          'Funds deposited at 23:42 from an unknown sender were forwarded within 9 minutes to CryptoDesk Agent@ybl.',
        relatedTransactionId: 'TXN-9020',
        relatedScanId: null,
        riskScore: 88,
        status: 'New',
        sourceType: 'Transaction Pattern',
        isDemo: true,
      },
      {
        id: 'ALT-4088',
        severity: 'Medium',
        createdAt: '2026-11-20T18:20:00.000Z',
        reason: 'UPI collect-request cashback bait detected',
        explanation:
          'Message lures the user with a ₹25,000 reward and asks them to enter a UPI PIN to receive money.',
        relatedTransactionId: null,
        relatedScanId: 'SCN-DEMO-103',
        riskScore: 68,
        status: 'Reviewed',
        sourceType: 'Message Scan',
        isDemo: true,
      },
      {
        id: 'ALT-4087',
        severity: 'Low',
        createdAt: '2026-11-20T09:12:00.000Z',
        reason: 'Verified stipend credit logged',
        explanation:
          'Routine scholarship credit matched regular account pattern with no mule forwarding activity.',
        relatedTransactionId: 'TXN-9011',
        relatedScanId: 'SCN-DEMO-104',
        riskScore: 8,
        status: 'Reviewed',
        sourceType: 'Transaction Pattern',
        isDemo: true,
      },
    ];
  }

  public addScanResult(scan: MessageAnalysisResult): void {
    this.scans.unshift(scan);
    if (this.scans.length > 50) {
      this.scans.pop();
    }

    if (scan.riskLevel !== 'Low Risk') {
      const severity = scan.riskLevel === 'High Risk' ? 'High' : 'Medium';
      this.alerts.unshift({
        id: `ALT-${Math.floor(4100 + Math.random() * 899)}`,
        severity,
        createdAt: scan.analyzedAt,
        reason: `${scan.scamCategory} detected in ${scan.channel}`,
        explanation: scan.simpleExplanation,
        relatedTransactionId: null,
        relatedScanId: scan.id,
        riskScore: scan.riskScore,
        status: 'New',
        sourceType: 'Message Scan',
        isDemo: false,
      });
    }
  }

  public setTransactionSummary(summary: TransactionAnalysisSummary): void {
    this.transactionSummary = summary;

    const highTx = summary.transactions.filter((t) => t.riskLevel === 'High Risk').slice(0, 3);
    for (const tx of highTx) {
      const alreadyExists = this.alerts.some(
        (a) => a.relatedTransactionId === tx.id && !a.isDemo,
      );
      if (!alreadyExists) {
        this.alerts.unshift({
          id: `ALT-${Math.floor(5000 + Math.random() * 899)}`,
          severity: 'High',
          createdAt: new Date().toISOString(),
          reason: `${tx.suspiciousPattern} (₹${tx.amount.toLocaleString('en-IN')})`,
          explanation: tx.topReasons[0]?.detail ?? 'Suspicious transaction sequence flagged.',
          relatedTransactionId: tx.id,
          relatedScanId: null,
          riskScore: tx.riskScore,
          status: 'New',
          sourceType: 'Transaction Pattern',
          isDemo: summary.isDemo,
        });
      }
    }
  }

  public updateRiskConfig(nextConfig: RiskEngineConfig): void {
    this.riskConfig = nextConfig;
    this.scans = this.scans.map((s) => ({
      ...s,
      riskLevel: classifyRiskLevel(s.riskScore, nextConfig),
    }));
    this.transactionSummary = {
      ...this.transactionSummary,
      overallRiskLevel: classifyRiskLevel(
        this.transactionSummary.overallMuleRiskScore,
        nextConfig,
      ),
      transactions: this.transactionSummary.transactions.map((t) => ({
        ...t,
        riskLevel: classifyRiskLevel(t.riskScore, nextConfig),
        isMuleSuspect: t.riskScore > nextConfig.lowThresholdMax,
      })),
    };
  }

  public getDashboardPayload(): DashboardPayload {
    const suspiciousTxCount = this.transactionSummary.suspiciousCount;
    const suspiciousScans = this.scans.filter((s) => s.riskLevel !== 'Low Risk').length;
    const highRiskAlerts = this.alerts.filter((a) => a.severity === 'High').length;

    const activityChart = [
      { day: 'Mon', scans: 4, suspiciousTx: 1, highRiskAlerts: 1 },
      { day: 'Tue', scans: 6, suspiciousTx: 2, highRiskAlerts: 1 },
      { day: 'Wed', scans: 5, suspiciousTx: 1, highRiskAlerts: 0 },
      { day: 'Thu', scans: 8, suspiciousTx: 3, highRiskAlerts: 2 },
      { day: 'Fri', scans: 7, suspiciousTx: 2, highRiskAlerts: 1 },
      { day: 'Sat', scans: 9, suspiciousTx: 4, highRiskAlerts: 2 },
      {
        day: 'Today',
        scans: this.scans.length,
        suspiciousTx: suspiciousTxCount,
        highRiskAlerts: this.alerts.filter((a) => a.severity === 'High' && a.status === 'New').length,
      },
    ];

    return {
      metrics: {
        totalMessageScans: this.scans.length,
        transactionsAnalysed: this.transactionSummary.totalTransactions,
        suspiciousActivities: suspiciousTxCount + suspiciousScans,
        highRiskAlerts,
      },
      activityChart,
      recentScans: this.scans.slice(0, 6),
      recentAlerts: this.alerts.slice(0, 6),
      riskConfig: this.riskConfig,
      transactionSummary: this.transactionSummary,
    };
  }
}

export const demoStore = new DemoStore();
