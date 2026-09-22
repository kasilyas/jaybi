export function validateJwtSecret(secret: string | undefined, environment: string): string {
  if (environment === 'development') return secret || 'dev-secret-change-me';
  const demo = ['dev-secret-change-me', 'change-me-in-production-use-a-long-random-string'];
  if (!secret || secret.trim().length < 32 || demo.includes(secret) || /^(.)\1+$/.test(secret)) {
    throw new Error('JWT_SECRET must contain at least 32 characters and must not be a demonstration value');
  }
  return secret;
}
