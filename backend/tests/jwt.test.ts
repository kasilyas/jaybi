import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';

// Test direct du module jwt avec un secret connu (contourne le mock env d'otp)
function sign(payload: object, secret: string, opts: jwt.SignOptions) {
  return jwt.sign(payload, secret, opts);
}

describe('jwt - sign/verify roundtrip', () => {
  const secret = 'test-secret-key';

  it('signe puis vérifie un token', () => {
    const token = sign({ sub: 'user-1', email: 'a@b.com', role: 'admin' }, secret, { expiresIn: '1h' as any });
    const decoded = jwt.verify(token, secret) as any;
    expect(decoded.sub).toBe('user-1');
    expect(decoded.email).toBe('a@b.com');
    expect(decoded.role).toBe('admin');
  });

  it('rejette un token signé avec un autre secret', () => {
    const token = sign({ sub: 'user-1' }, secret, { expiresIn: '1h' as any });
    expect(() => jwt.verify(token, 'wrong-secret')).toThrow();
  });

  it('rejette un token expiré', () => {
    const token = sign({ sub: 'user-1' }, secret, { expiresIn: '-1s' as any });
    expect(() => jwt.verify(token, secret)).toThrow();
  });
});
