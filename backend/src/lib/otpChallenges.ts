import { randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { HttpError } from '../middleware/errors.js';
const TTL = 10 * 60_000;
const WINDOW = 15 * 60_000;
const digest = (code: string) => createHash('sha256').update(code).digest();
type Challenge = { id: string; hash: Buffer; expiresAt: number; attempts: number };
/** Single-instance bounded store. A shared durable store is required before scaling. */
export class OtpChallenges {
  private challenges = new Map<string, Challenge>();
  private limits = new Map<string, { count: number; until: number; last: number; locked: boolean }>();
  constructor(private now = () => Date.now()) {}
  issue(email: string, code: string): string {
    const now = this.now();
    for (const [key, value] of this.limits) if (value.until <= now) this.limits.delete(key);
    for (const [key, value] of this.challenges) if (value.expiresAt <= now) this.challenges.delete(key);
    const limit = this.limits.get(email);
    if (limit && (limit.locked || limit.count >= 5 || now - limit.last < 60_000)) throw new HttpError(429, 'OTP_RATE_LIMITED');
    if (!limit && this.limits.size >= 10000) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
    this.limits.set(email, { count: (limit?.count ?? 0) + 1, until: limit?.until ?? now + WINDOW, last: now, locked: false });
    const id = randomUUID();
    this.challenges.set(email, { id, hash: digest(code), expiresAt: now + TTL, attempts: 0 });
    return id;
  }
  discard(email: string, id: string) {
    if (this.challenges.get(email)?.id === id) this.challenges.delete(email);
  }
  verify(email: string, code: string): 'OK' | 'OTP_EXPIRED' | 'WRONG_CODE' | 'OTP_LOCKED' {
    const limit = this.limits.get(email);
    if (limit?.locked && limit.until > this.now()) return 'OTP_LOCKED';
    const entry = this.challenges.get(email);
    if (!entry || entry.expiresAt <= this.now()) { this.challenges.delete(email); return 'OTP_EXPIRED'; }
    if (!timingSafeEqual(entry.hash, digest(code))) {
      if (++entry.attempts >= 5) {
        this.challenges.delete(email);
        if (limit) limit.locked = true;
        return 'OTP_LOCKED';
      }
      return 'WRONG_CODE';
    }
    this.challenges.delete(email);
    return 'OK';
  }
}
