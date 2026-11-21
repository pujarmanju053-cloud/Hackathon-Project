import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import type { RiskEngineConfig } from './src/types.ts';
import { demoStore } from './server/demoStore.ts';
import { evaluateCombinedRisk } from './server/riskEngine.ts';
import { analyzeMessage } from './server/scamDetector.ts';
import {
  SAMPLE_MULE_CSV,
  SAMPLE_NORMAL_CSV,
  analyzeTransactions,
  parseTransactionCsv,
} from './server/transactionAnalyzer.ts';

const PORT = Number.parseInt(process.env.PORT ?? '3000', 10) || 3000;

async function startServer() {
  await demoStore.init();

  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'MuleGuard API' });
  });

  // Dashboard summary
  app.get('/api/dashboard', (_req, res) => {
    res.json(demoStore.getDashboardPayload());
  });

  // Analyze scam message (deterministic rules + optional Gemini explanation)
  app.post('/api/analyze-message', async (req, res) => {
    try {
      const body = req.body as { message?: unknown; channel?: unknown };
      if (typeof body?.message !== 'string' || body.message.trim().length < 5) {
        res.status(400).json({
          error: 'Please enter a message of at least 5 characters to scan.',
        });
        return;
      }

      if (body.message.length > 4000) {
        res.status(400).json({
          error: 'Message is too long. Please keep scanned text under 4,000 characters.',
        });
        return;
      }

      const channel =
        typeof body.channel === 'string' && body.channel.trim().length > 0
          ? body.channel.trim().slice(0, 60)
          : 'SMS / WhatsApp';

      const result = await analyzeMessage(
        {
          message: body.message,
          channel,
          isDemo: false,
        },
        demoStore.riskConfig,
      );

      demoStore.addScanResult(result);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to analyze message.';
      res.status(500).json({ error: message });
    }
  });

  // Analyze transaction CSV or sample preset
  app.post('/api/analyze-transactions', (req, res) => {
    try {
      const body = req.body as {
        csvText?: unknown;
        preset?: unknown;
        datasetName?: unknown;
      };

      let csvText = '';
      let datasetName = 'Uploaded Transaction CSV';
      let isDemo = false;

      if (body?.preset === 'mule') {
        csvText = SAMPLE_MULE_CSV;
        datasetName = 'Sample Mule Pass-Through Ledger (Demo)';
        isDemo = true;
      } else if (body?.preset === 'normal') {
        csvText = SAMPLE_NORMAL_CSV;
        datasetName = 'Sample Safe Student Account (Demo)';
        isDemo = true;
      } else if (typeof body?.csvText === 'string' && body.csvText.trim().length > 0) {
        if (body.csvText.length > 500_000) {
          res.status(400).json({ error: 'CSV file exceeds 500 KB limit.' });
          return;
        }
        csvText = body.csvText;
        if (typeof body.datasetName === 'string' && body.datasetName.trim().length > 0) {
          datasetName = body.datasetName.trim().slice(0, 80);
        }
      } else {
        res.status(400).json({
          error: 'Provide a CSV file or select a sample transaction preset.',
        });
        return;
      }

      const rows = parseTransactionCsv(csvText);
      const summary = analyzeTransactions(rows, {
        datasetName,
        isDemo,
        riskConfig: demoStore.riskConfig,
      });

      demoStore.setTransactionSummary(summary);
      res.json(summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to parse CSV transactions.';
      res.status(400).json({ error: message });
    }
  });

  // Download sample CSV files
  app.get('/api/sample-csv/:preset', (req, res) => {
    const preset = req.params.preset;
    if (preset === 'mule') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="muleguard-sample-mule.csv"');
      res.send(SAMPLE_MULE_CSV);
      return;
    }
    if (preset === 'normal') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="muleguard-sample-safe.csv"');
      res.send(SAMPLE_NORMAL_CSV);
      return;
    }
    res.status(404).json({ error: 'Unknown sample CSV preset.' });
  });

  // Current transaction summary
  app.get('/api/transactions', (_req, res) => {
    res.json(demoStore.transactionSummary);
  });

  // Alerts list & status update
  app.get('/api/alerts', (_req, res) => {
    res.json(demoStore.alerts);
  });

  app.patch('/api/alerts/:id', (req, res) => {
    const { id } = req.params;
    const body = req.body as { status?: unknown };
    if (body?.status !== 'New' && body?.status !== 'Reviewed') {
      res.status(400).json({ error: 'Status must be "New" or "Reviewed".' });
      return;
    }

    const alert = demoStore.alerts.find((a) => a.id === id);
    if (!alert) {
      res.status(404).json({ error: 'Alert not found.' });
      return;
    }

    alert.status = body.status;
    res.json(alert);
  });

  // Risk Engine configuration & combined simulation
  app.get('/api/risk-config', (_req, res) => {
    res.json(demoStore.riskConfig);
  });

  app.put('/api/risk-config', (req, res) => {
    const body = req.body as Partial<RiskEngineConfig>;
    const messageWeight = Number(body.messageWeight);
    const mulePatternWeight = Number(body.mulePatternWeight);
    const anomalyWeight = Number(body.anomalyWeight);
    const lowThresholdMax = Number(body.lowThresholdMax);
    const mediumThresholdMax = Number(body.mediumThresholdMax);

    if (
      !Number.isFinite(messageWeight) ||
      !Number.isFinite(mulePatternWeight) ||
      !Number.isFinite(anomalyWeight) ||
      !Number.isFinite(lowThresholdMax) ||
      !Number.isFinite(mediumThresholdMax) ||
      messageWeight < 0 ||
      mulePatternWeight < 0 ||
      anomalyWeight < 0 ||
      messageWeight + mulePatternWeight + anomalyWeight <= 0 ||
      lowThresholdMax < 10 ||
      lowThresholdMax >= mediumThresholdMax ||
      mediumThresholdMax > 95
    ) {
      res.status(400).json({
        error: 'Invalid risk engine weights or threshold bounds.',
      });
      return;
    }

    const updated: RiskEngineConfig = {
      messageWeight: Math.round(messageWeight),
      mulePatternWeight: Math.round(mulePatternWeight),
      anomalyWeight: Math.round(anomalyWeight),
      lowThresholdMax: Math.round(lowThresholdMax),
      mediumThresholdMax: Math.round(mediumThresholdMax),
    };

    demoStore.updateRiskConfig(updated);
    res.json(updated);
  });

  app.post('/api/risk-evaluate', (req, res) => {
    const body = req.body as {
      messageScore?: unknown;
      mulePatternScore?: unknown;
      anomalyScore?: unknown;
    };
    const messageScore = Number(body.messageScore ?? 0);
    const mulePatternScore = Number(body.mulePatternScore ?? 0);
    const anomalyScore = Number(body.anomalyScore ?? 0);

    if (
      !Number.isFinite(messageScore) ||
      !Number.isFinite(mulePatternScore) ||
      !Number.isFinite(anomalyScore)
    ) {
      res.status(400).json({ error: 'All risk input scores must be valid numbers.' });
      return;
    }

    const evaluation = evaluateCombinedRisk(
      {
        messageScore,
        mulePatternScore,
        anomalyScore,
      },
      demoStore.riskConfig,
    );
    res.json(evaluation);
  });

  // Vite dev middleware or production static assets
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MuleGuard server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start MuleGuard server:', err);
  process.exit(1);
});
