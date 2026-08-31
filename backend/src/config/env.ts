import dotenv from 'dotenv';
dotenv.config();

const required = (key: string, fallback?: string): string => {
  const v = process.env[key] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env var: ${key}`);
  return v;
};

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';

// En production : JWT_SECRET obligatoire, pas de fallback.
// En dev/test : fallback autorisé pour le confort local.
const jwtSecret = isProduction
  ? required('JWT_SECRET') // throw si manquant en prod
  : required('JWT_SECRET', 'dev-secret-change-me');

// DEV_BYPASS ne peut JAMAIS être true en production.
// En dev/test : défaut true pour le confort local.
const rawDevBypass = String(process.env.DEV_BYPASS ?? (isProduction ? 'false' : 'true')) === 'true';
const devBypass = isProduction ? false : rawDevBypass;

export const env = {
  nodeEnv,
  isDev: !isProduction,
  isTest: nodeEnv === 'test',
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  devBypass,
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  smtp: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM ?? 'Jaybi <no-reply@jaybi.ma>',
  },
};
