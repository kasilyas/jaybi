/**
 * Security alert service — crée des alertes, suspend des comptes,
 * et notifie l'admin par email en cas de prompt injection détectée.
 * Conforme OWASP LLM01 / NIST AI RMF.
 */
import { prisma } from './prisma.js';
import { addAuditLog } from './audit.js';
import { env } from '../config/env.js';
import type { InjectionDetectionResult } from './promptInjection.js';

const ADMIN_EMAIL = 'admin@qayess.io';

/**
 * Gère une tentative de prompt injection détectée :
 * 1. Crée une SecurityAlert en base
 * 2. Suspend le compte utilisateur
 * 3. Envoie un email à l'admin (si SMTP configuré)
 * 4. Crée un audit log
 */
export async function handleInjectionAttempt(opts: {
  userId?: string;
  userEmail: string;
  detection: InjectionDetectionResult;
  endpoint: string;
}): Promise<void> {
  const { userId, userEmail, detection, endpoint } = opts;

  // 1. Crée l'alerte de sécurité
  const alert = await prisma.securityAlert.create({
    data: {
      userId: userId ?? null,
      userEmail,
      severity: detection.severity,
      score: detection.score,
      patterns: detection.matchedPatterns,
      inputText: detection.sanitizedText.slice(0, 500),
      endpoint,
    },
  }).catch(() => null);

  // 2. Suspend le compte si l'utilisateur est identifié
  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isSuspended: true,
        suspendedReason: `Prompt injection détectée (${detection.severity}): ${detection.matchedPatterns.join(', ')}`,
        suspendedAt: new Date(),
      },
    }).catch(() => null);
  }

  // 3. Audit log
  await addAuditLog({
    action: 'PROMPT_INJECTION_DETECTED',
    user: userEmail,
    userEmail,
    details: `Tentative d'injection (${detection.severity}, score ${detection.score}) sur ${endpoint}. Patterns: ${detection.matchedPatterns.join(', ')}. Compte suspendu.`,
    type: 'danger',
  });

  // 4. Email à l'admin (non-bloquant)
  if (env.smtp.host) {
    sendAdminAlertEmail(userEmail, detection, endpoint).catch((e) => {
      console.error('[security] envoi email admin échoué:', e);
    });
  }

  console.warn(`[SECURITY] Prompt injection détectée: ${userEmail} sur ${endpoint} (severity=${detection.severity}, score=${detection.score}, patterns=${detection.matchedPatterns.join(',')})`);
}

/**
 * Envoie un email d'alerte à l'administrateur.
 */
async function sendAdminAlertEmail(
  userEmail: string,
  detection: InjectionDetectionResult,
  endpoint: string,
): Promise<void> {
  // Import dynamique pour éviter la dépendance circulaire
  // @ts-expect-error — nodemailer est une dépendance optionnelle (absence gérée au runtime)
  const nodemailer = await import('nodemailer').catch(() => null);
  if (!nodemailer?.default) {
    console.warn('[security] nodemailer non installé, email admin non envoyé');
    return;
  }

  const transporter = nodemailer.default.createTransport({
    host: env.smtp.host,
    port: env.smtp.port ?? 587,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });

  const subject = `[JAYBI SECURITY] Tentative de prompt injection - ${detection.severity.toUpperCase()}`;
  const text = `
ALERTE DE SÉCURITÉ — Tentative de prompt injection détectée

Utilisateur: ${userEmail}
Sévérité: ${detection.severity}
Score: ${detection.score}
Endpoint: ${endpoint}
Patterns détectés: ${detection.matchedPatterns.join(', ')}

Extrait du texte suspect:
${detection.sanitizedText.slice(0, 300)}

ACTION AUTOMATIQUE: Le compte a été suspendu.
Vérifiez le panneau d'administration pour plus de détails et réactiver le compte si nécessaire.

Timestamp: ${new Date().toISOString()}
`;

  await transporter.sendMail({
    from: env.smtp.from,
    to: ADMIN_EMAIL,
    subject,
    text,
  });
}

/**
 * Réactive un compte suspendu (admin uniquement).
 */
export async function unsuspendUser(userId: string, adminEmail: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      isSuspended: false,
      suspendedReason: null,
      suspendedAt: null,
    },
  });

  // Marque les alertes associées comme résolues
  await prisma.securityAlert.updateMany({
    where: { userId, resolved: false },
    data: { resolved: true, resolvedBy: adminEmail, resolvedAt: new Date() },
  });

  await addAuditLog({
    action: 'USER_UNSUSPENDED',
    user: adminEmail,
    userEmail: adminEmail,
    details: `Compte ${userId} réactivé après suspension (prompt injection)`,
    type: 'success',
  });
}
