import { prisma } from '../lib/prisma.js';
import { adapterRegistry } from './adapterRegistry.js';
import { normalizeAll } from './normalizer.js';
import { detectChanges } from './changeDetector.js';

const POLL_INTERVAL_MS = 5_000;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 500) : 'Erreur de synchronisation inconnue';
}

/**
 * Processes one queued adapter run. Only this worker calls adapters: HTTP
 * requests only enqueue a run, so large catalogues remain resumable.
 */
export async function processNextRun(): Promise<boolean> {
  const candidate = await prisma.syncRun.findFirst({
    where: { status: 'pending', mode: 'full_scrape' },
    orderBy: { createdAt: 'asc' },
  });
  if (!candidate) return false;

  const claim = await prisma.syncRun.updateMany({
    where: { id: candidate.id, status: 'pending' },
    data: { status: 'running', startedAt: new Date(), errors: [] },
  });
  if (!claim.count) return false;

  try {
    const scraped = await adapterRegistry.scrapeWith(candidate.adapter);
    if (!scraped.length) throw new Error('EMPTY_SOURCE_RESULT');

    const changes = await detectChanges(normalizeAll(scraped));
    const endedAt = new Date();
    await prisma.syncRun.update({
      where: { id: candidate.id },
      data: {
        status: 'dry_run',
        endedAt,
        productsFound: scraped.length,
        productsNew: changes.newProducts.length,
        pricesUpdated: changes.priceChanges.length,
        promotionsFound: changes.promotions.length,
        errors: [],
        changes: changes as object,
      },
    });
    await prisma.syncConfig.updateMany({
      where: { adapter: candidate.adapter },
      data: { lastRunAt: endedAt, lastStatus: 'dry_run' },
    });
  } catch (error) {
    const endedAt = new Date();
    const message = errorMessage(error);
    await prisma.syncRun.update({
      where: { id: candidate.id },
      data: { status: 'failed', endedAt, errors: [{ message, timestamp: endedAt.toISOString() }] },
    });
    await prisma.syncConfig.updateMany({
      where: { adapter: candidate.adapter },
      data: { lastRunAt: endedAt, lastStatus: 'failed' },
    });
    console.error(`[scraping-worker] Run ${candidate.id} failed: ${message}`);
  }
  return true;
}

async function run(): Promise<void> {
  console.log('[scraping-worker] Ready');
  while (true) {
    const processed = await processNextRun();
    if (!processed) await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
}

void run();
