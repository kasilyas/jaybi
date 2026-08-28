import { env } from '../config/env.js';

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
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * En production : envoie le code par email via SMTP.
 * En dev : no-op (le code est renvoyé au client pour les tests).
 */
export async function sendOtpEmail(email: string, code: string): Promise<void> {
  if (env.devBypass) return; // no-op
  // TODO(prod): brancher nodemailer avec env.smtp
  // Pour l'instant on lève pour signaler que SMTP n'est pas configuré en prod.
  throw new Error('SMTP not configured: cannot send OTP in production mode');
}
