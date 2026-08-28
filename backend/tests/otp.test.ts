import { describe, it, expect, vi, beforeEach } from 'vitest';

// On pilote DEV_BYPASS via process.env et resetModules pour recharger env.ts.
beforeEach(() => {
  vi.resetModules();
});

describe('otp - generateOtp', () => {
  it('retourne le code fixe 123456 en mode devBypass', async () => {
    process.env.DEV_BYPASS = 'true';
    const { generateOtp, DEV_OTP_CODE } = await import('../src/lib/otp.js');
    expect(generateOtp()).toBe(DEV_OTP_CODE);
    expect(generateOtp()).toBe('123456');
  });

  it('génère un code à 6 chiffres hors bypass', async () => {
    process.env.DEV_BYPASS = 'false';
    const { generateOtp } = await import('../src/lib/otp.js');
    const code = generateOtp();
    expect(code).toMatch(/^\d{6}$/);
  });
});

describe('otp - sendOtpEmail', () => {
  it('est un no-op en devBypass (ne lève pas)', async () => {
    process.env.DEV_BYPASS = 'true';
    const { sendOtpEmail } = await import('../src/lib/otp.js');
    await expect(sendOtpEmail('x@y.com', '123456')).resolves.toBeUndefined();
  });

  it('lève en production sans SMTP configuré', async () => {
    process.env.DEV_BYPASS = 'false';
    const { sendOtpEmail } = await import('../src/lib/otp.js');
    await expect(sendOtpEmail('x@y.com', '123456')).rejects.toThrow();
  });
});
