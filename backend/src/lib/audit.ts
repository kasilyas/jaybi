import { prisma } from './prisma.js';
import { AuditType } from '@prisma/client';

/**
 * Journalisation d'audit. Toutes les actions sensibles (login, CRUD admin,
 * signalements, commandes) doivent être tracées.
 */
export async function addAuditLog(params: {
  action: string;
  user: string;
  userEmail: string;
  details: string;
  type?: AuditType;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        user: params.user,
        userEmail: params.userEmail,
        details: params.details,
        type: params.type ?? 'info',
      },
    });
  } catch (e) {
    // L'audit ne doit jamais casser le flux principal
    console.error('[audit] failed to write log:', e);
  }
}
