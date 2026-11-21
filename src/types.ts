export type RiskLevel = 'Low Risk' | 'Medium Risk' | 'High Risk';

export type SeverityLevel = 'Low' | 'Medium' | 'High';

export interface RiskFactor {
  id: string;
  label: string;
  weight: number;
  points: number;
  detail: string;
}

export interface ManipulationAxis {
  axis: 'Fear' | 'Urgency' | 'Greed' | 'Trust Manipulation' | 'Authority Impersonation' | 'Reward Temptation';
  score: number;
  matchedSignals: string[];
  explanation: string;
}

export interface ScamProgressionStage {
  stage: number;
  title: string;
  summary: string;
  warningSign: string;
  safeAction: string;
}

export interface MessageAnalysisResult {
  id: string;
  message: string;
  channel: string;
  analyzedAt: string;
  riskScore: number;
  riskLevel: RiskLevel;
  scamCategory: string;
  detectedRedFlags: string[];
  topReasons: RiskFactor[];
  simpleExplanation: string;
  recommendedNextSteps: string[];
  manipulationRadar: ManipulationAxis[];
  scamFutureLab: ScamProgressionStage[];
  aiEnhanced: boolean;
  aiStatusNote: string;
  isDemo?: boolean;
}

export interface AnalyzedTransaction {
  id: string;
  timestamp: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  sender: string;
  receiver: string;
  balanceAfter: number;
  description: string;
  suspiciousPattern: string;
  riskScore: number;
  riskLevel: RiskLevel;
  topReasons: RiskFactor[];
  isMuleSuspect: boolean;
}

export interface FlowNode {
  id: string;
  label: string;
  role: 'source' | 'kiosk_account' | 'destination';
  totalAmount: number;
  txCount: number;
  riskLevel: RiskLevel;
}

export interface FlowEdge {
  from: string;
  to: string;
  amount: number;
  txId: string;
  flagged: boolean;
  note: string;
}

export interface TransactionAnalysisSummary {
  datasetName: string;
  analyzedAt: string;
  totalTransactions: number;
  suspiciousCount: number;
  highRiskCount: number;
  totalIncoming: number;
  totalOutgoing: number;
  overallMuleRiskScore: number;
  overallRiskLevel: RiskLevel;
  topPatterns: string[];
  topReasons: RiskFactor[];
  transactions: AnalyzedTransaction[];
  flowNodes: FlowNode[];
  flowEdges: FlowEdge[];
  timeSeries: Array<{
    label: string;
    incoming: number;
    outgoing: number;
    suspicious: number;
    normal: number;
  }>;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  isDemo: boolean;
}

export interface FraudAlert {
  id: string;
  severity: SeverityLevel;
  createdAt: string;
  reason: string;
  explanation: string;
  relatedTransactionId: string | null;
  relatedScanId: string | null;
  riskScore: number;
  status: 'New' | 'Reviewed';
  sourceType: 'Message Scan' | 'Transaction Pattern';
  isDemo?: boolean;
}

export interface RiskEngineConfig {
  messageWeight: number;
  mulePatternWeight: number;
  anomalyWeight: number;
  lowThresholdMax: number;
  mediumThresholdMax: number;
}

export interface CombinedRiskEvaluation {
  combinedScore: number;
  riskLevel: RiskLevel;
  topReasons: RiskFactor[];
  breakdown: {
    messageContribution: number;
    muleContribution: number;
    anomalyContribution: number;
  };
}

export interface DashboardPayload {
  metrics: {
    totalMessageScans: number;
    transactionsAnalysed: number;
    suspiciousActivities: number;
    highRiskAlerts: number;
  };
  activityChart: Array<{
    day: string;
    scans: number;
    suspiciousTx: number;
    highRiskAlerts: number;
  }>;
  recentScans: MessageAnalysisResult[];
  recentAlerts: FraudAlert[];
  riskConfig: RiskEngineConfig;
  transactionSummary: TransactionAnalysisSummary;
}
