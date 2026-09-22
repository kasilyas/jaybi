import { Response } from 'express';
import { Router } from '../lib/router.js';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { addAuditLog } from '../lib/audit.js';
import { normalizeAll } from '../scraping/normalizer.js';
import { detectChanges } from '../scraping/changeDetector.js';
import { publishChanges } from '../scraping/publisher.js';
import { parseCsv } from '../scraping/csvImport.js';
import { adapterRegistry } from '../scraping/adapterRegistry.js';
import type { SyncChanges } from '../scraping/types.js';
import { z } from 'zod';

export const scrapingRouter = Router();

const sourceUrlSchema = z.string().url().refine(value => new URL(value).protocol === 'https:', 'HTTPS_REQUIRED').nullable();
const configSchema = z.object({
  enabled: z.boolean().optional(),
  sourceType: z.enum(['scraper', 'api', 'csv']).optional(),
  sourceUrl: sourceUrlSchema.optional(),
  cronSchedule: z.string().trim().min(1).max(120).optional(),
  maxPages: z.number().int().min(1).max(200).optional(),
  rateLimitMs: z.number().int().min(250).max(120_000).optional(),
  respectRobotsTxt: z.boolean().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
}).strict();

const adapterSources = {
  marjane: { type: 'api', hosts: ['api.apify.com', 'www.marjanemall.ma', 'marjanemall.ma', 'www.marjane.ma', 'marjane.ma'] },
  mymarket: { type: 'api', hosts: ['mymarket.ma', 'www.mymarket.ma'] },
  aswak: { type: 'scraper', hosts: ['aswakdelivery.com', 'www.aswakdelivery.com'] },
  bim: { type: 'scraper', hosts: ['cataloguebim.com', 'www.cataloguebim.com'] },
  carrefour: { type: 'scraper', hosts: ['promomaroc.com', 'www.promomaroc.com'] },
  csv_import: { type: 'csv', hosts: [] },
} as const;

// All routes admin-only
scrapingRouter.use(authenticate, requireRole('admin'));

// GET /scraping/runs — historique
scrapingRouter.get('/runs', async (_req, res: Response) => {
  const runs = await prisma.syncRun.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(runs);
});

// GET /scraping/runs/:id — détail
scrapingRouter.get('/runs/:id', async (req, res: Response) => {
  const run = await prisma.syncRun.findUnique({ where: { id: req.params.id } });
  if (!run) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(run);
});

// GET /scraping/status — statut live
scrapingRouter.get('/status', async (_req, res: Response) => {
  const configs = await prisma.syncConfig.findMany();
  const status: any[] = [];
  for (const cfg of configs) {
    const lastRun = await prisma.syncRun.findFirst({
      where: { adapter: cfg.adapter },
      orderBy: { createdAt: 'desc' },
    });
    status.push({
      adapter: cfg.adapter,
      enabled: cfg.enabled,
      sourceType: cfg.sourceType,
      lastStatus: lastRun?.status ?? null,
      lastRunAt: lastRun?.startedAt?.toISOString() ?? null,
      lastProductsFound: lastRun?.productsFound ?? 0,
      cronSchedule: cfg.cronSchedule,
    });
  }
  res.json(status);
});

// GET /scraping/config
scrapingRouter.get('/config', async (_req, res: Response) => {
  const configs = await prisma.syncConfig.findMany();
  res.json(configs);
});

// PUT /scraping/config/:adapter
scrapingRouter.put('/config/:adapter', async (req, res: Response) => {
  const parsed = configSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
  const { enabled, sourceType, sourceUrl, cronSchedule, maxPages, rateLimitMs, respectRobotsTxt, notes } = parsed.data;
  const knownAdapter = adapterSources[req.params.adapter as keyof typeof adapterSources];
  if (!knownAdapter) return res.status(404).json({ error: 'ADAPTER_NOT_FOUND' });
  if (sourceType && sourceType !== knownAdapter.type) return res.status(400).json({ error: 'INVALID_SOURCE_TYPE' });
  if (sourceUrl && !knownAdapter.hosts.includes(new URL(sourceUrl).hostname as never)) return res.status(400).json({ error: 'SOURCE_NOT_ALLOWED' });
  const existing = await prisma.syncConfig.findUnique({ where: { adapter: req.params.adapter } });
  if (!existing) {
    const created = await prisma.syncConfig.create({
      data: {
        adapter: req.params.adapter,
        enabled: enabled ?? true,
        sourceType: sourceType ?? 'scraper',
        sourceUrl,
        cronSchedule: cronSchedule ?? '0 6 * * *',
        maxPages: maxPages ?? 50,
        rateLimitMs: rateLimitMs ?? 2000,
        respectRobotsTxt: respectRobotsTxt ?? true,
        notes,
      },
    });
    return res.json(created);
  }
  const updated = await prisma.syncConfig.update({
    where: { adapter: req.params.adapter },
    data: {
      ...(enabled !== undefined ? { enabled } : {}),
      ...(sourceType ? { sourceType } : {}),
      ...(sourceUrl !== undefined ? { sourceUrl } : {}),
      ...(cronSchedule ? { cronSchedule } : {}),
      ...(maxPages !== undefined ? { maxPages } : {}),
      ...(rateLimitMs !== undefined ? { rateLimitMs } : {}),
      ...(respectRobotsTxt !== undefined ? { respectRobotsTxt } : {}),
      ...(notes !== undefined ? { notes } : {}),
    },
  });
  await addAuditLog({ action: 'SYNC_CONFIG_UPDATE', user: req.user!.email, userEmail: req.user!.email, details: `Config ${req.params.adapter} mise à jour`, type: 'info' });
  res.json(updated);
});

// POST /scraping/dry-run
scrapingRouter.post('/dry-run', async (req, res: Response) => {
  const { adapter, csv, products } = req.body;
  if (!adapter) return res.status(400).json({ error: 'INVALID_INPUT', message: 'adapter requis' });

  let scrapedProducts: any[];
  if (csv) {
    scrapedProducts = parseCsv(csv, adapter);
  } else if (products && Array.isArray(products)) {
    scrapedProducts = products;
  } else {
    return res.status(400).json({ error: 'INVALID_INPUT', message: 'csv ou products requis' });
  }

  const normalized = normalizeAll(scrapedProducts);
  if (!normalized.length) return res.status(400).json({ error: 'EMPTY_SYNC' });
  const changes = await detectChanges(normalized);

  const run = await prisma.syncRun.create({
    data: {
      adapter,
      status: 'dry_run',
      mode: 'dry_run',
      triggeredBy: req.user!.email,
      endedAt: new Date(),
      productsFound: scrapedProducts.length,
      productsNew: changes.newProducts.length,
      pricesUpdated: changes.priceChanges.length,
      promotionsFound: changes.promotions.length,
      errors: [],
      changes: changes as any,
    },
  });

  res.json({ runId: run.id, changes });
});

// POST /scraping/run — queue an adapter collection. The worker creates a
// dry-run preview; publishing remains a separate explicit approval.
scrapingRouter.post('/run', async (req, res: Response) => {
  const adapter = typeof req.body?.adapter === 'string' ? req.body.adapter : '';
  if (!adapter || !adapterRegistry.get(adapter)) return res.status(400).json({ error: 'INVALID_ADAPTER' });
  const config = await prisma.syncConfig.findUnique({ where: { adapter } });
  if (!config || !config.enabled) return res.status(409).json({ error: 'ADAPTER_DISABLED' });

  const run = await prisma.syncRun.create({
    data: { adapter, status: 'pending', mode: 'full_scrape', triggeredBy: req.user!.email, errors: [] },
  });
  await addAuditLog({ action: 'SYNC_QUEUED', user: req.user!.email, userEmail: req.user!.email, details: `Collecte ${adapter} mise en file (run ${run.id})`, type: 'info' });
  res.status(202).json({ run });
});

// POST /scraping/:runId/approve
scrapingRouter.post('/:runId/approve', async (req, res: Response) => {
  const run = await prisma.syncRun.findUnique({ where: { id: req.params.runId } });
  if (!run) return res.status(404).json({ error: 'NOT_FOUND' });
  if (run.status !== 'dry_run') return res.status(400).json({ error: 'NOT_DRY_RUN' });

  const changes = run.changes as unknown as SyncChanges;
  if (!changes) return res.status(400).json({ error: 'NO_CHANGES' });
  if (changes.reviewRequired?.length) return res.status(409).json({ error: 'MATCH_REVIEW_REQUIRED' });
  if (!changes.newProducts.length && !changes.priceChanges.length) return res.status(400).json({ error: 'EMPTY_SYNC' });

  const result = await publishChanges(changes, req.user!.email, run.adapter);

  await prisma.syncRun.update({
    where: { id: run.id },
    data: {
      status: 'completed',
      endedAt: new Date(),
      productsNew: result.productsNew,
      pricesUpdated: result.pricesUpdated,
    },
  });

  res.json({ ok: true, ...result });
});

// POST /scraping/:runId/reject
scrapingRouter.post('/:runId/reject', async (req, res: Response) => {
  const run = await prisma.syncRun.findUnique({ where: { id: req.params.runId } });
  if (!run) return res.status(404).json({ error: 'NOT_FOUND' });
  if (run.status !== 'dry_run') return res.status(400).json({ error: 'NOT_DRY_RUN' });

  await prisma.syncRun.update({
    where: { id: run.id },
    data: { status: 'rejected', endedAt: new Date() },
  });

  await addAuditLog({ action: 'SYNC_REJECTED', user: req.user!.email, userEmail: req.user!.email, details: `Sync ${run.adapter} rejeté`, type: 'warning' });
  res.json({ ok: true });
});

// POST /scraping/import — import CSV direct
scrapingRouter.post('/import', async (req, res: Response) => {
  const { adapter, csv } = req.body;
  if (!csv || !adapter) return res.status(400).json({ error: 'INVALID_INPUT', message: 'adapter et csv requis' });

  const scrapedProducts = parseCsv(csv, adapter);
  if (scrapedProducts.length === 0) return res.status(400).json({ error: 'INVALID_INPUT', message: 'Aucun produit trouvé dans le CSV' });

  const normalized = normalizeAll(scrapedProducts);
  const changes = await detectChanges(normalized);

  const run = await prisma.syncRun.create({
    data: {
      adapter,
      status: 'dry_run',
      mode: 'manual',
      triggeredBy: req.user!.email,
      endedAt: new Date(),
      productsFound: scrapedProducts.length,
      productsNew: changes.newProducts.length,
      pricesUpdated: changes.priceChanges.length,
      promotionsFound: changes.promotions.length,
      errors: [],
      changes: changes as any,
    },
  });

  res.json({ runId: run.id, changes });
});
