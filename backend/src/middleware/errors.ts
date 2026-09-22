import type { ErrorRequestHandler } from 'express';

export class HttpError extends Error {
  constructor(public status: number, public code: string, message = code) { super(message); }
}
const prismaErrors: Record<string, [number, string]> = {
  P2002: [409, 'CONFLICT'], P2025: [404, 'NOT_FOUND'], P2003: [400, 'INVALID_REFERENCE'],
  P2034: [409, 'CONCURRENT_UPDATE'], P2024: [503, 'SERVICE_UNAVAILABLE'],
};
export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) return next(err);
  const [status, code] = err instanceof HttpError ? [err.status, err.code]
    : prismaErrors[err?.code] ?? (err?.type === 'entity.parse.failed' ? [400, 'INVALID_JSON']
    : err?.type === 'entity.too.large' ? [413, 'PAYLOAD_TOO_LARGE'] : [500, 'INTERNAL_ERROR']);
  // Never log a raw error, SQL, credentials, body, or Prisma invocation.
  if (status >= 500) console.error(JSON.stringify({ event: 'request_failed', status, code }));
  res.status(status).json({ error: { code, message: code } });
};
