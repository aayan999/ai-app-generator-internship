import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { configLoader } from './config/configLoader';
import { db } from './database/connection';
import { generateSchema } from './database/schemaGenerator';
import { createDynamicRouter, createConfigRouter } from './api/dynamicRouter';
import { createAuthRouter } from './auth/authController';
import { createExportRouter } from './export/githubExporter';
import { salaryRouter } from './api/salaryRouter';
import { globalErrorHandler } from './utils/errorHandler';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const log = logger;

async function bootstrap(): Promise<void> {
  log.info('🚀 Starting AI App Generator Backend...');

  // ── Step 1: Load Configuration ──────────────────────────────────────
  const config = configLoader.load();
  log.info(`App: ${config.app.name} v${config.app.version}`);

  const warnings = configLoader.getWarnings();
  if (warnings.length > 0) {
    log.warn(`Config has ${warnings.length} cross-validation warnings`);
  }

  // ── Step 2: Connect to Database ─────────────────────────────────────
  await db.connect();

  // ── Step 3: Generate Schema ─────────────────────────────────────────
  if (db.isConnected()) {
    await generateSchema(config);
  }

  // ── Step 4: Create Express App ──────────────────────────────────────
  const app = express();
  const port = parseInt(process.env.PORT || '4000', 10);

  // Middleware
  // Allow multiple origins: localhost, any *.vercel.app, plus explicit list in FRONTEND_URL
  const explicitOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((o) => o.trim());

  app.use(cors({
    origin: (origin, callback) => {
      // Allow ALL origins for local development/testing to prevent port mismatch issues
      callback(null, true);
    },
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('dev'));

  // ── Step 5: Mount Routes ────────────────────────────────────────────

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        app: config.app.name,
        version: config.app.version,
        database: db.isConnected() ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
      },
    });
  });

  // Config endpoint (for frontend)
  app.use(config.api.prefix, createConfigRouter());

  // Auth routes
  if (config.auth.enabled) {
    app.use(`${config.api.prefix}/auth`, createAuthRouter());
    log.info(`Auth routes mounted at: ${config.api.prefix}/auth`);
  }

  // Dynamic CRUD routes
  if (db.isConnected()) {
    app.use(config.api.prefix, createDynamicRouter());
    log.info(`Dynamic API routes mounted at: ${config.api.prefix}`);
  } else {
    log.warn('Dynamic routes not mounted — database is not connected');
    // Provide a fallback route that explains the situation
    app.use(config.api.prefix, (_req, res) => {
      res.status(503).json({
        success: false,
        error: { message: 'Database not available. API routes are disabled.' },
      });
    });
  }

  // Export routes
  if (config.export.github.enabled) {
    app.use(`${config.api.prefix}/export`, createExportRouter());
    log.info(`Export routes mounted at: ${config.api.prefix}/export`);
  }

  // Custom Salary Routes
  app.use(config.api.prefix, salaryRouter);
  log.info(`Salary routes mounted at: ${config.api.prefix}/ingest-salary`);

  // ── Step 6: Error Handling ──────────────────────────────────────────
  app.use(globalErrorHandler);

  // ── Step 7: Start Server ────────────────────────────────────────────
  app.listen(port, () => {
    log.info(`✅ Server running on http://localhost:${port}`);
    log.info(`📡 API prefix: ${config.api.prefix}`);
    log.info(`🩺 Health: http://localhost:${port}/health`);
    log.info(`⚙️  Config: http://localhost:${port}${config.api.prefix}/config`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    log.info('Shutting down...');
    await db.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  log.error('Fatal error during startup', {
    message: err.message,
    stack: err.stack,
  });
  process.exit(1);
});
