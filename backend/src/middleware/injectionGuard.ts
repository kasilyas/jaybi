/**
 * Middleware anti-prompt injection.
 * Vérifie les champs texte du body pour les tentatives d'injection.
 * Si détecté : suspend le compte, crée une alerte, notifie l'admin, retourne 403.
 *
 * OWASP LLM01 / NIST AI RMF.
 */
import { Request, Response, NextFunction } from 'express';
import { detectPromptInjectionInObject } from '../lib/promptInjection.js';
import { handleInjectionAttempt } from '../lib/securityAlert.js';

/**
 * Middleware qui scanne le body de la requête pour les injections.
 * À utiliser sur les routes qui acceptent du texte utilisateur
 * (suggestions, reports, auth, etc.).
 */
export function injectionGuard(endpoint: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.body || Object.keys(req.body).length === 0) {
      return next();
    }

    const detection = detectPromptInjectionInObject(req.body);

    if (detection.detected) {
      // Si l'utilisateur est authentifié, on le suspend
      const userId = req.user?.sub;
      const userEmail = req.user?.email ?? req.body?.email ?? 'anonymous';

      await handleInjectionAttempt({
        userId,
        userEmail,
        detection,
        endpoint,
      });

      return res.status(403).json({
        error: 'INJECTION_DETECTED',
        message: 'Tentative de prompt injection détectée. Le compte a été suspendu.',
        severity: detection.severity,
      });
    }

    next();
  };
}
