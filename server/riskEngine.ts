import type {
  CombinedRiskEvaluation,
  RiskEngineConfig,
  RiskFactor,
  RiskLevel,
} from '../src/types.ts';

export const DEFAULT_RISK_CONFIG: RiskEngineConfig = {
  messageWeight: 40,
  mulePatternWeight: 35,
  anomalyWeight: 25,
  lowThresholdMax: 30,
  mediumThresholdMax: 70,
};

export function classifyRiskLevel(
  score: number,
  config: RiskEngineConfig = DEFAULT_RISK_CONFIG,
): RiskLevel {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  if (clamped <= config.lowThresholdMax) return 'Low Risk';
  if (clamped <= config.mediumThresholdMax) return 'Medium Risk';
  return 'High Risk';
}

export function evaluateCombinedRisk(
  params: {
    messageScore: number;
    mulePatternScore: number;
    anomalyScore: number;
    messageReasons?: RiskFactor[];
    muleReasons?: RiskFactor[];
    anomalyReasons?: RiskFactor[];
  },
  config: RiskEngineConfig = DEFAULT_RISK_CONFIG,
): CombinedRiskEvaluation {
  const totalWeight =
    Math.max(1, config.messageWeight + config.mulePatternWeight + config.anomalyWeight);

  const normMessage = config.messageWeight / totalWeight;
  const normMule = config.mulePatternWeight / totalWeight;
  const normAnomaly = config.anomalyWeight / totalWeight;

  const msg = Math.max(0, Math.min(100, params.messageScore));
  const mule = Math.max(0, Math.min(100, params.mulePatternScore));
  const anom = Math.max(0, Math.min(100, params.anomalyScore));

  const messageContribution = Math.round(msg * normMessage);
  const muleContribution = Math.round(mule * normMule);
  const anomalyContribution = Math.round(anom * normAnomaly);

  const combinedScore = Math.max(
    0,
    Math.min(100, messageContribution + muleContribution + anomalyContribution),
  );

  const pool: RiskFactor[] = [
    ...(params.messageReasons ?? []),
    ...(params.muleReasons ?? []),
    ...(params.anomalyReasons ?? []),
  ];

  if (pool.length === 0) {
    if (msg > 0) {
      pool.push({
        id: 'combined-message',
        label: 'Message Scam Indicators',
        weight: Math.round(normMessage * 100),
        points: messageContribution,
        detail: `Message signal scored ${msg}/100 with ${Math.round(normMessage * 100)}% engine weight.`,
      });
    }
    if (mule > 0) {
      pool.push({
        id: 'combined-mule',
        label: 'Money Mule Pattern Score',
        weight: Math.round(normMule * 100),
        points: muleContribution,
        detail: `Mule pass-through and aggregation rules scored ${mule}/100.`,
      });
    }
    if (anom > 0) {
      pool.push({
        id: 'combined-anomaly',
        label: 'Transaction Velocity & Balance Anomaly',
        weight: Math.round(normAnomaly * 100),
        points: anomalyContribution,
        detail: `Timing, frequency, and near-zero balance checks scored ${anom}/100.`,
      });
    }
  }

  const topReasons = [...pool]
    .sort((a, b) => b.points - a.points)
    .slice(0, 3);

  return {
    combinedScore,
    riskLevel: classifyRiskLevel(combinedScore, config),
    topReasons,
    breakdown: {
      messageContribution,
      muleContribution,
      anomalyContribution,
    },
  };
}
