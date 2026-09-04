// Publish a sync run directly (bypasses HTTP timeout)
// Usage: npx tsx scripts/publish-direct.ts <runId>
import { prisma } from '../src/lib/prisma.js';
import { publishChanges } from '../src/scraping/publisher.js';

async function main() {
  const runId = process.argv[2];
  if (!runId) {
    console.error('Usage: npx tsx scripts/publish-direct.ts <runId>');
    process.exit(1);
  }

  console.log(`Loading sync run ${runId}...`);
  const run = await prisma.syncRun.findUnique({ where: { id: runId } });
  if (!run) {
    console.error('Run not found');
    process.exit(1);
  }

  console.log(`Status: ${run.status}, Products found: ${run.productsFound}`);
  const changes = run.changes as any;
  console.log(`New products: ${changes.newProducts?.length}`);
  console.log(`Price changes: ${changes.priceChanges?.length}`);

  console.log('\nPublishing directly (bypassing HTTP)...');
  const start = Date.now();
  const result = await publishChanges(changes, 'admin@qayess.io', run.adapter);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`\n✅ Published in ${elapsed}s`);
  console.log(`  New products: ${result.productsNew}`);
  console.log(`  Prices updated: ${result.pricesUpdated}`);

  // Update run status
  await prisma.syncRun.update({
    where: { id: runId },
    data: { status: 'published' },
  });
  console.log('Run status updated to "published"');

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
