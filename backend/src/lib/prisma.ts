import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

// Singleton Prisma (évite d'ouvrir trop de connexions en hot-reload).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isDev && !env.isTest ? ['warn', 'error'] : ['error'],
  });

if (env.isDev) globalForPrisma.prisma = prisma;
