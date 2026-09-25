import type { Response } from 'express';

export class AppError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export const ok = <T>(res: Response, data: T, status = 200) => res.status(status).json({ success: true, data });
export const page = <T>(res: Response, data: T[], total: number, pageNumber: number, limit: number) =>
  ok(res, { items: data, pagination: { page: pageNumber, limit, total, pages: Math.ceil(total / limit) } });
export const pagination = (query: Record<string, unknown>) => ({
  page: Math.max(1, Number(query.page) || 1),
  limit: Math.min(100, Math.max(1, Number(query.limit) || 20)),
});

