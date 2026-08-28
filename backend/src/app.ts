import express from 'express';
import cors from 'cors';
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

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  // Health check
  app.get('/health', (_req, res) => res.json({ status: 'ok', env: env.nodeEnv }));

  // Routes API (préfixe /api)
  app.use('/api/auth', authRouter);
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

  // 404
  app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));

  // Gestion d'erreurs
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[error]', err);
    const status = err.status ?? 500;
    res.status(status).json({ error: err.code ?? 'INTERNAL_ERROR', message: err.message });
  });

  return app;
}
