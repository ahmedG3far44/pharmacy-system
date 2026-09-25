import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../lib/http.js';
import { config } from '../config.js';

export const originGuard: RequestHandler = (req, _res, next) => {
  if (!['GET','HEAD','OPTIONS'].includes(req.method)) {
    const origin = req.get('origin');
    if (origin && origin !== config.CLIENT_ORIGIN) return next(new AppError(403, 'INVALID_ORIGIN', 'Request origin is not allowed.'));
  }
  next();
};

export const notFound: RequestHandler = (_req, _res, next) => next(new AppError(404, 'NOT_FOUND', 'Resource not found.'));

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  let status = error instanceof AppError ? error.status : 500;
  let code = error instanceof AppError ? error.code : 'INTERNAL_ERROR';
  let message = error instanceof AppError ? error.message : 'Something went wrong.';
  if (error instanceof ZodError) { status = 400; code = 'VALIDATION_ERROR'; message = error.issues[0]?.message ?? 'Invalid request.'; }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') { status = 409; code = 'DUPLICATE_VALUE'; message = 'A record with this unique value already exists.'; }
  if (process.env.NODE_ENV !== 'test' && status >= 500) console.error(error);
  res.status(status).json({ success: false, error: { code, message } });
};
