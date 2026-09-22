import express from 'express';
import { errorHandler } from './middleware/errors.js';
import { asyncHandler } from './lib/router.js';
import { prisma } from './lib/prisma.js';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { authRouter } from './routes/auth.routes.js';
import { productsRouter } from './routes/products.routes.js';
import { usersRouter } from './routes/users.routes.js';
import { ordersRouter } from './routes/orders.routes.js';
import { packsRouter } from './routes/packs.routes.js';
import { promoRouter } from './routes/promo.routes.js';
import { storesRouter } from './routes/stores.routes.js';
import { brandsRouter } from './routes/brands.routes.js';
import { reportsRouter } from './routes/reports.routes.js';
import { auditRouter } from './routes/audit.routes.js';
import { configRouter } from './routes/config.routes.js';
import { suggestionsRouter } from './routes/suggestions.routes.js';
import { securityRouter } from './routes/security.routes.js';
import { scrapingRouter } from './routes/scraping.routes.js';
import { aiRouter } from './routes/ai.routes.js';
import { maintenanceGuard } from './middleware/maintenance.js';

// Rate limiter global : 100 req / 15 min par IP (désactivé en test)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.isTest,
  message: { error: 'RATE_LIMITED' },
});

// Rate limiter auth : 10 req / 15 min par IP (request-otp + verify-otp)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.isTest,
  message: { error: 'RATE_LIMITED_AUTH' },
});

export function createApp() {
  const app = express();

  app.use(helmet({
    contentSecurityPolicy: env.isDev ? false : undefined,
    crossOriginEmbedderPolicy: false,
  }));
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  // Health check (sans exposer nodeEnv en prod)
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/ready', asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready' });
  }));
  app.use(globalLimiter);

  // Routes API (préfixe /api)
  app.use('/api', asyncHandler(maintenanceGuard));
  app.use('/api/auth', authLimiter, authRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/packs', packsRouter);
  app.use('/api/promo', promoRouter);
  app.use('/api/stores', storesRouter);
  app.use('/api/brands', brandsRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api/config', configRouter);
  app.use('/api/suggestions', suggestionsRouter);
  app.use('/api/security', securityRouter);
  app.use('/api/scraping', scrapingRouter);
  app.use('/api/ai', aiRouter);

  // 404
  app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));

  // Gestion d'erreurs — en prod, on ne leak pas err.message
  app.use(errorHandler);

  return app;
}
