import { Router as ExpressRouter, type RequestHandler } from 'express';

/** Every registered handler, including middleware, forwards rejected promises. */
export const asyncHandler = (handler: RequestHandler): RequestHandler => (req, res, next) => {
  Promise.resolve().then(() => handler(req, res, next)).catch(next);
};

export function Router(): ExpressRouter {
  const router = ExpressRouter();
  for (const method of ['get', 'post', 'put', 'patch', 'delete', 'use', 'all', 'options', 'head'] as const) {
    const register = (router[method] as Function).bind(router);
    const wrap = (value: any): any => Array.isArray(value) ? value.map(wrap)
      : typeof value === 'function' && value.length < 4 ? asyncHandler(value) : value;
    (router as any)[method] = (...args: any[]) => register(...args.map(wrap));
  }
  return router;
}
