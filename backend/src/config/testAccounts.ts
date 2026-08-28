/**
 * Comptes de test pour l'auto-connexion en mode dev (DEV_BYPASS).
 * Uniquement utilisés quand env.devBypass === true.
 * En production, cet endpoint est désactivé.
 */
export const TEST_ACCOUNTS = [
  { email: 'admin@qayess.io', role: 'admin', tier: 'unlimited', name: 'Super Admin' },
  { email: 'premium@qayess.ma', role: 'customer', tier: 'pack2', name: 'Sarah Bennani' },
  { email: 'user@qayess.ma', role: 'customer', tier: 'free', name: 'Amine Tazi' },
  { email: 'tech@qayess.ma', role: 'contributor', tier: 'pack1', name: 'Omar Idrissi' },
] as const;
