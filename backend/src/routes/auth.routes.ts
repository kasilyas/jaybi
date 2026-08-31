import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';
import { generateOtp, sendOtpEmail, DEV_OTP_CODE } from '../lib/otp.js';
import { addAuditLog } from '../lib/audit.js';
import { serializeUser } from '../lib/serialize.js';
import { env } from '../config/env.js';
import { TEST_ACCOUNTS } from '../config/testAccounts.js';
import { authenticate } from '../middleware/auth.js';

export const authRouter = Router();

// Stockage transitoire des OTP (email -> { code, expiresAt }).
// MVP mono-instance. En production multi-instance : utiliser Redis/DB.
const otpStore = new Map<string, { code: string; expiresAt: number }>();
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

const requestOtpSchema = z.object({
  email: z.string().email(),
  password: z.string().optional(),
});

const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  name: z.string().optional(), // pour l'inscription
});

/**
 * POST /auth/request-otp
 * Démarre le flux 2FA : génère un OTP et (en prod) l'envoie par email.
 * En dev (DEV_BYPASS), le code est renvoyé dans la réponse.
 */
authRouter.post('/request-otp', async (req, res: Response) => {
  const parsed = requestOtpSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });

  const { email } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });

  // Si l'utilisateur existe et a un mot de passe, on l'exige avant l'OTP.
  if (existing && existing.passwordHash) {
    if (!parsed.data.password) return res.status(401).json({ error: 'PASSWORD_REQUIRED' });
    const ok = await bcrypt.compare(parsed.data.password, existing.passwordHash);
    if (!ok) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
  }

  const code = generateOtp();
  otpStore.set(email.toLowerCase(), { code, expiresAt: Date.now() + OTP_TTL_MS });

  try {
    await sendOtpEmail(email, code);
  } catch {
    return res.status(500).json({ error: 'OTP_SEND_FAILED' });
  }

  const response: any = { sent: true };
  if (env.devBypass) response.devCode = code; // dev only
  res.json(response);
});

/**
 * POST /auth/verify-otp
 * Vérifie l'OTP. Si l'utilisateur n'existe pas, crée un compte `customer`/`free`
 * (inscription). @security Aucune escalade de rôle.
 */
authRouter.post('/verify-otp', async (req, res: Response) => {
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });

  const { email, name } = parsed.data;
  const key = email.toLowerCase();
  const entry = otpStore.get(key);

  // En dev bypass, le code attendu est toujours 123456, MAIS on exige
  // qu'une entrée OTP existe et ne soit pas expirée (anti-bypass sans request).
  if (!entry || entry.expiresAt < Date.now()) {
    return res.status(400).json({ error: 'OTP_EXPIRED' });
  }
  const expectedCode = env.devBypass ? DEV_OTP_CODE : entry.code;
  if (parsed.data.code !== expectedCode) {
    return res.status(400).json({ error: 'WRONG_CODE' });
  }
  otpStore.delete(key);

  // Trouve ou crée l'utilisateur
  let user = await prisma.user.findUnique({ where: { email }, include: { addresses: true } });
  let isNew = false;
  if (!user) {
    isNew = true;
    user = await prisma.user.create({
      data: {
        name: name ?? email.split('@')[0],
        email,
        role: 'customer',
        tier: 'free',
        isPremium: false,
        savingsScore: 0,
      },
      include: { addresses: true },
    });
  }

  if (user.isDeleted) return res.status(403).json({ error: 'ACCOUNT_DISABLED' });

  const token = signToken({ sub: user.id, email: user.email, role: user.role });
  await addAuditLog({
    action: isNew ? 'SIGNUP' : 'LOGIN',
    user: user.name,
    userEmail: user.email,
    details: isNew ? 'Inscription nouveau compte' : 'Connexion utilisateur',
    type: isNew ? 'success' : 'info',
  });

  res.json({ token, user: serializeUser(user) });
});

/**
 * GET /auth/me — profil de l'utilisateur authentifié.
 */
authRouter.get('/me', authenticate, async (req, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    include: { addresses: true },
  });
  if (!user || user.isDeleted) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(serializeUser(user));
});

/**
 * GET /auth/test-accounts — liste des comptes de test (DEV ONLY).
 * Désactivé hors devBypass.
 */
authRouter.get('/test-accounts', (_req, res: Response) => {
  if (!env.devBypass) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json({ accounts: TEST_ACCOUNTS });
});

/**
 * POST /auth/dev-login — auto-connexion d'un compte de test (DEV ONLY).
 * Bypass OTP. Le compte doit exister et ne pas être supprimé.
 */
authRouter.post('/dev-login', async (req, res: Response) => {
  if (!env.devBypass) return res.status(404).json({ error: 'NOT_FOUND' });
  const email = String(req.body?.email ?? '').toLowerCase();
  const allowed = TEST_ACCOUNTS.some(a => a.email.toLowerCase() === email);
  if (!allowed) return res.status(403).json({ error: 'FORBIDDEN' });

  const user = await prisma.user.findUnique({
    where: { email },
    include: { addresses: true },
  });
  if (!user || user.isDeleted) return res.status(404).json({ error: 'NOT_FOUND' });

  const token = signToken({ sub: user.id, email: user.email, role: user.role });
  await addAuditLog({ action: 'DEV_LOGIN', user: user.name, userEmail: user.email, details: 'Auto-login test', type: 'info' });
  res.json({ token, user: serializeUser(user) });
});
