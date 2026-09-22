import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import net from 'node:net';
import express from 'express';
import request from 'supertest';
const config = vi.hoisted(() => ({ nodeEnv: 'test', devBypass: false, smtp: { host: '127.0.0.1', port: 0, from: 'qa@example.test' } }));
vi.mock('../src/config/env.js', () => ({ env: config }));
vi.mock('../src/lib/prisma.js', () => ({ prisma: { user: {
  findUnique: vi.fn(async () => null), create: vi.fn(async ({ data }: any) => ({ id: 'qa', ...data, addresses: [] })),
} } }));
vi.mock('../src/lib/jwt.js', () => ({ signToken: () => 'qa-token' }));
vi.mock('../src/lib/audit.js', () => ({ addAuditLog: vi.fn() }));
vi.mock('../src/middleware/auth.js', () => ({ authenticate: (_r: any, _s: any, next: any) => next() }));
vi.mock('../src/middleware/injectionGuard.js', () => ({ injectionGuard: () => (_r: any, _s: any, next: any) => next() }));
import { authRouter } from '../src/routes/auth.routes.js';
import { errorHandler } from '../src/middleware/errors.js';

let mail = ''; let rejectMail = false;
const sockets = new Set<net.Socket>();
const server = net.createServer(socket => {
  sockets.add(socket); socket.on('close', () => sockets.delete(socket));
  socket.write('220 Jaybi QA SMTP\r\n'); let buffer = ''; let inData = false;
  socket.on('data', data => {
    buffer += data.toString();
    while (buffer.includes('\r\n')) {
      const end = buffer.indexOf('\r\n'); const line = buffer.slice(0, end); buffer = buffer.slice(end + 2);
      if (inData) { if (line === '.') { inData = false; socket.write('250 queued\r\n'); } else mail += line + '\n'; continue; }
      if (/^(EHLO|HELO)/.test(line)) socket.write('250 QA\r\n');
      else if (/^DATA/.test(line)) { inData = true; mail = ''; socket.write('354 end with dot\r\n'); }
      else if (/^QUIT/.test(line)) socket.end('221 bye\r\n');
      else if (/^RCPT/.test(line) && rejectMail) socket.write('550 rejected\r\n');
      else socket.write('250 ok\r\n');
    }
  });
});
const app = express(); app.use(express.json()); app.use(authRouter); app.use(errorHandler);
beforeAll(async () => {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  config.smtp.port = (server.address() as net.AddressInfo).port;
});
afterAll(async () => { for (const socket of sockets) socket.destroy(); await new Promise<void>(resolve => server.close(() => resolve())); });
describe('OTP over a real local SMTP transport without bypass', () => {
  it('sends a random code, signs in and rejects replay', async () => {
    const email = 'smtp-flow@example.test';
    const sent = await request(app).post('/request-otp').send({ email });
    expect(sent.status).toBe(200); expect(sent.body.devCode).toBeUndefined();
    const code = mail.match(/\b\d{6}\b/)?.[0]; expect(code).toBeDefined();
    const verified = await request(app).post('/verify-otp').send({ email, code });
    expect(verified.status).toBe(200); expect(verified.body.token).toBe('qa-token');
    expect((await request(app).post('/verify-otp').send({ email, code })).body.error).toBe('OTP_EXPIRED');
  });
  it('discards the challenge after SMTP rejects the message', async () => {
    rejectMail = true;
    expect((await request(app).post('/request-otp').send({ email: 'failed@example.test' })).status).toBe(500);
    expect((await request(app).post('/verify-otp').send({ email: 'failed@example.test', code: '123456' })).body.error).toBe('OTP_EXPIRED');
  });
});
