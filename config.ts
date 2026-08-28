/**
 * Configuration d'environnement côté client.
 *
 * IMPORTANT : toute feature de "bypass" (2FA fixe, auto-login de test, affichage
 * du code OTP) DOIT être gated par `DEV_BYPASS`. Cette variable n'est jamais
 * définie dans un build de production (`vite build` sans VITE_DEV_BYPASS).
 *
 * En développement : créer un fichier `.env.local` avec `VITE_DEV_BYPASS=true`.
 */
export const DEV_BYPASS: boolean =
  import.meta.env?.VITE_DEV_BYPASS === true ||
  import.meta.env?.VITE_DEV_BYPASS === 'true';

/** Code OTP fixe utilisé uniquement quand DEV_BYPASS est actif. */
export const DEV_OTP_CODE = '123456';

/**
 * Liste des comptes de test autorisés pour l'auto-connexion en mode dev.
 * Uniquement consulté quand DEV_BYPASS === true.
 * En production, cette liste n'a aucun effet (l'auth réelle est côté backend).
 */
export type TestAccount = {
  email: string;
  role: 'customer' | 'contributor' | 'admin';
  tier: 'free' | 'pack1' | 'pack2' | 'unlimited';
  name: string;
};

export const TEST_ACCOUNTS: TestAccount[] = [
  { email: 'admin@qayess.io', role: 'admin', tier: 'unlimited', name: 'Super Admin' },
  { email: 'premium@qayess.ma', role: 'customer', tier: 'pack2', name: 'Sarah Bennani' },
  { email: 'user@qayess.ma', role: 'customer', tier: 'free', name: 'Amine Tazi' },
  { email: 'tech@qayess.ma', role: 'contributor', tier: 'pack1', name: 'Omar Idrissi' },
];
