import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/http.js';
import { verifyToken } from '../lib/security.js';

export const rolePermissions: Record<Role, string[]> = {
  ADMIN: ['*'],
  PHARMACIST: ['dashboard:view','sale:create','sale:view:any','return:create','return:approve','product:view','product:create','product:update','inventory:view','inventory:adjust','purchase:view','purchase:create','purchase:receive','supplier:view','supplier:create','supplier:update','report:sales','report:inventory'],
  CASHIER: ['dashboard:view','sale:create','sale:view:own','product:view','inventory:availability'],
};

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.pharmacy_session;
    if (!token) throw new AppError(401, 'AUTH_REQUIRED', 'Please sign in to continue.');
    const { payload } = await verifyToken(token);
    if (!payload.sub || typeof payload.sid !== 'string') throw new Error('Invalid token');
    const session = await prisma.session.findUnique({ where: { id: payload.sid }, include: { user: true } });
    if (!session || session.revokedAt || session.expiresAt < new Date() || !session.user.isActive) {
      throw new AppError(401, 'SESSION_EXPIRED', 'Your session has expired. Please sign in again.');
    }
    await prisma.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } });
    req.auth = { userId: session.userId, sessionId: session.id, role: session.user.role, permissions: rolePermissions[session.user.role] };
    next();
  } catch (error) { next(error instanceof AppError ? error : new AppError(401, 'INVALID_SESSION', 'Invalid session.')); }
}

export const authorize = (...permissions: string[]) => (req: Request, _res: Response, next: NextFunction) => {
  const granted = req.auth?.permissions ?? [];
  if (!granted.includes('*') && !permissions.some((permission) => granted.includes(permission))) {
    return next(new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action.'));
  }
  next();
};
