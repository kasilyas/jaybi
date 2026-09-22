import { Response } from 'express';
import { Router } from '../lib/router.js';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';
import { generateOtp, sendOtpEmail } from '../lib/otp.js';
import { OtpChallenges } from '../lib/otpChallenges.js';
import { addAuditLog } from '../lib/audit.js';
import { serializeUser } from '../lib/serialize.js';
import { env } from '../config/env.js';
import { TEST_ACCOUNTS } from '../config/testAccounts.js';
import { authenticate } from '../middleware/auth.js';
import { injectionGuard } from '../middleware/injectionGuard.js';

export const authRouter = Router();

// Stockage transitoire des OTP (email -> { code, expiresAt }).
// MVP mono-instance. En production multi-instance : utiliser Redis/DB.
const otpStore = new OtpChallenges();

const requestOtpSchema = z.object({
  email: z.string().trim().email().max(254).transform(v => v.toLowerCase()),
  password: z.string().optional(),
});

const verifyOtpSchema = z.object({
  email: z.string().trim().email().max(254).transform(v => v.toLowerCase()),
  code: z.string().regex(/^\d{6}$/),
  name: z.string().trim().min(1).max(120).optional(),
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
  const challengeId = otpStore.issue(email, code);

  try {
    await sendOtpEmail(email, code);
  } catch {
    otpStore.discard(email, challengeId);
    return res.status(500).json({ error: 'OTP_SEND_FAILED' });
  }

  const response: any = { sent: true };
  if (env.devBypass) response.devCode = code; // dev only
  if (env.localMailboxUrl) response.mailboxUrl = env.localMailboxUrl;
  res.json(response);
});

/**
 * POST /auth/verify-otp
 * Vérifie l'OTP. Si l'utilisateur n'existe pas, crée un compte `customer`/`free`
 * (inscription). @security Aucune escalade de rôle.
 */
authRouter.post('/verify-otp', injectionGuard('/api/auth/verify-otp'), async (req, res: Response) => {
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });

  const { email, name } = parsed.data;
  const verification = otpStore.verify(email, parsed.data.code);
  if (verification !== 'OK') return res.status(verification === 'OTP_LOCKED' ? 429 : 400).json({ error: verification });

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
  if (user.isSuspended) return res.status(403).json({ error: 'ACCOUNT_SUSPENDED' });

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

const passwordConfirmSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
  newPassword: z.string().min(8, 'PASSWORD_TOO_SHORT').max(128),
}).strict();

/**
 * POST /auth/password/request-code — envoie un OTP sur l'email du compte
 * authentifié pour autoriser un changement de mot de passe.
 */
authRouter.post('/password/request-code', authenticate, async (req, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.sub }, select: { email: true } });
  if (!user) return res.status(404).json({ error: 'NOT_FOUND' });

  const code = generateOtp();
  const challengeId = otpStore.issue(user.email, code);
  try {
    await sendOtpEmail(user.email, code);
  } catch {
    otpStore.discard(user.email, challengeId);
    return res.status(500).json({ error: 'OTP_SEND_FAILED' });
  }

  const response: any = { sent: true };
  if (env.devBypass) response.devCode = code;
  if (env.localMailboxUrl) response.mailboxUrl = env.localMailboxUrl;
  res.json(response);
});

/**
 * POST /auth/password/confirm — vérifie l'OTP et remplace le mot de passe.
 * Invalide tous les tokens précédents via passwordChangedAt et renvoie un
 * token frais pour la session courante.
 */
authRouter.post('/password/confirm', authenticate, async (req, res: Response) => {
  const parsed = passwordConfirmSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });

  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: { email: true, name: true },
  });
  if (!user) return res.status(404).json({ error: 'NOT_FOUND' });

  const verification = otpStore.verify(user.email, parsed.data.code);
  if (verification !== 'OK') return res.status(verification === 'OTP_LOCKED' ? 429 : 400).json({ error: verification });

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: req.user!.sub },
    data: { passwordHash, passwordChangedAt: new Date() },
  });
  await addAuditLog({
    action: 'PASSWORD_CHANGED',
    user: user.name,
    userEmail: user.email,
    details: 'Mot de passe modifié après vérification OTP',
    type: 'info',
  });

  const token = signToken({ sub: req.user!.sub, email: user.email, role: req.user!.role });
  res.json({ ok: true, token });
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
