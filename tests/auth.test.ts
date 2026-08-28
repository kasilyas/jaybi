import { describe, it, expect } from 'vitest';
import { buildNewUser } from '../lib/auth';

describe('auth - buildNewUser (règle anti-escalade)', () => {
  it('attribue toujours le rôle customer et le tier free', () => {
    const u = buildNewUser('someone@email.com');
    expect(u.role).toBe('customer');
    expect(u.tier).toBe('free');
    expect(u.isPremium).toBe(false);
  });

  it('naugmente PAS en admin même si lemail contient "admin"', () => {
    const u = buildNewUser('admin@evil.com');
    expect(u.role).toBe('customer');
    expect(u.tier).toBe('free');
  });

  it('naugmente PAS en premium même si lemail contient "premium"', () => {
    const u = buildNewUser('premium@evil.com');
    expect(u.role).toBe('customer');
    expect(u.isPremium).toBe(false);
  });

  it('déduit le nom depuis lemail pour le provider email', () => {
    expect(buildNewUser('amine@qayess.ma').name).toBe('amine');
  });

  it('utilise le nom du provider pour les logins sociaux', () => {
    expect(buildNewUser('x@y.com', 'Google').name).toBe('Google User');
  });

  it('initialise savingsScore à 0 et addresses vides', () => {
    const u = buildNewUser('x@y.com');
    expect(u.savingsScore).toBe(0);
    expect(u.addresses).toEqual([]);
  });
});
