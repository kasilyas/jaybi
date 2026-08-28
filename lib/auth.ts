import { User, UserRole, SubscriptionTier } from '../types';

/**
 * Règles d'attribution des rôles côté inscription (frontend).
 *
 * @security Aucune escalade : tout nouvel inscrit reçoit le rôle `customer`
 * et le tier `free`. Le rôle `admin` / `contributor` et les tiers payants ne
 * peuvent être attribués que par un administrateur (backend v0.2) ou via les
 * seeds. Cette fonction est volontairement déterministe et sans exception.
 */
export function buildNewUser(email: string, provider: string = 'email'): User {
  return {
    id: `USR-${Date.now()}`,
    name: provider === 'email' ? email.split('@')[0] : `${provider} User`,
    email,
    role: 'customer' satisfies UserRole,
    savingsScore: 0,
    isPremium: false,
    tier: 'free' satisfies SubscriptionTier,
    addresses: [],
  };
}
