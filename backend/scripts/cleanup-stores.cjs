const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const d = await p.store.deleteMany({
    where: { OR: [{ name: { startsWith: 'Store Test' } }, { name: { startsWith: 'Store DELETE' } }] },
  });
  console.log('Stores test supprimés:', d.count);
  const s = await p.store.findMany({ select: { name: true } });
  console.log('Stores restants:', s.map(x => x.name).join(', '));
  await p.$disconnect();
})();
