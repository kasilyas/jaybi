import { prisma } from '../src/lib/prisma.js';

(async () => {
  const b = await prisma.brand.upsert({ where: { name: 'TestBrand' }, update: {}, create: { name: 'TestBrand' } });
  console.log('Brand:', b.id);

  // Test 1: brandId direct
  try {
    const p = await prisma.product.create({ data: { name: 'Test Product', brandId: b.id, category: 'Test', image: '', isActive: true } });
    console.log('✅ brandId direct works:', p.id);
    await prisma.product.delete({ where: { id: p.id } });
  } catch (e: any) {
    console.log('❌ brandId direct fails:', e.message.split('\n')[0]);
  }

  // Test 2: brand: { connect }
  try {
    const p = await prisma.product.create({ data: { name: 'Test Product 2', brand: { connect: { id: b.id } }, category: 'Test', image: '', isActive: true } });
    console.log('✅ brand connect works:', p.id);
    await prisma.product.delete({ where: { id: p.id } });
  } catch (e: any) {
    console.log('❌ brand connect fails:', e.message.split('\n')[0]);
  }

  // Test 3: no brand at all
  try {
    const p = await prisma.product.create({ data: { name: 'Test Product 3', category: 'Test', image: '', isActive: true } });
    console.log('✅ no brand works:', p.id);
    await prisma.product.delete({ where: { id: p.id } });
  } catch (e: any) {
    console.log('❌ no brand fails:', e.message.split('\n')[0]);
  }

  await prisma.brand.delete({ where: { id: b.id } });
  await prisma.$disconnect();
})();
