import { env } from '../config/env.js';
import { randomInt } from 'node:crypto';
import nodemailer from 'nodemailer';

/**
 * Génération / vérification des codes OTP (2FA email).
 *
 * @security En mode dev (DEV_BYPASS=true), le code est fixé à "123456" et
 * retourné dans la réponse (aucun envoi SMTP). En production, un code à 6
 * chiffres est généré et doit être envoyé par SMTP (à brancher).
 */
export const DEV_OTP_CODE = '123456';

export function generateOtp(): string {
  if (env.devBypass) return DEV_OTP_CODE;
  return String(randomInt(100000, 1000000));
}

/**
 * En production : envoie le code par email via SMTP.
 * En dev : no-op (le code est renvoyé au client pour les tests).
 */
export async function sendOtpEmail(email: string, code: string): Promise<void> {
  if (env.devBypass) return; // no-op
  if (!env.smtp.host) throw new Error('SMTP not configured');
  const transport = nodemailer.createTransport({
    host: env.smtp.host, port: env.smtp.port ?? 587, secure: env.smtp.port === 465,
    requireTLS: env.smtp.requireTls,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
  });
  try {
    await transport.sendMail({ from: env.smtp.from, to: email, subject: 'Votre code de connexion Jaybi',
      text: `Votre code de connexion est ${code}. Il expire dans 10 minutes. Ne le partagez pas.` });
  } finally { transport.close(); }
}
