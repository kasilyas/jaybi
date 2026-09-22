import { PrismaClient } from '@prisma/client';
export default async function setup() {
  const target = process.env.QA_DATABASE_URL;
  if (!target) throw new Error('QA_DATABASE_URL required; no fallback to the catalogue database');
  const url = new URL(target);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/jaybi_qa' || url.username !== 'jaybi_qa') {
    throw new Error('Refusing unrecognized QA target');
  }
  const db = new PrismaClient({ datasources: { db: { url: target } } });
  try {
    const marker = await db.$queryRaw<{ purpose: string }[]>`SELECT purpose FROM "_jaybi_qa_marker" WHERE purpose = 'isolated-integration-tests'`;
    if (marker.length !== 1) throw new Error('Missing isolated QA marker');
  } finally { await db.$disconnect(); }
}
