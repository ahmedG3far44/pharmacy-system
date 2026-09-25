import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError, ok } from '../lib/http.js';
import { createToken, hashToken, normalizePhone, verifyPassword } from '../lib/security.js';
import { authenticate, rolePermissions } from '../middleware/auth.js';
import { config } from '../config.js';

export const authRouter = Router();
const loginLimit = rateLimit({ windowMs: 15 * 60_000, limit: 5, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false });
const cookieOptions = { httpOnly: true, secure: config.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: 12 * 60 * 60_000 };

authRouter.get('/public-settings', async (_req, res) => {
  const settings = await prisma.setting.findMany({ where: { key: { in: ['pharmacyName'] } } });
  ok(res, { pharmacyName: String(settings.find((item) => item.key === 'pharmacyName')?.value ?? 'Demo Pharmacy') });
});

authRouter.post('/login', loginLimit, async (req, res) => {
  const body = z.object({ phone: z.string().min(8), password: z.string().min(8) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { phone: normalizePhone(body.phone) } });
  if (!user || !(await verifyPassword(body.password, user.passwordHash))) throw new AppError(401, 'INVALID_CREDENTIALS', 'Phone number or password is incorrect.');
  if (!user.isActive) throw new AppError(403, 'USER_INACTIVE', 'This employee account is disabled.');
  const expiresAt = new Date(Date.now() + cookieOptions.maxAge);
  const session = await prisma.session.create({ data: { userId: user.id, tokenHash: 'pending', expiresAt, ipAddress: req.ip, userAgent: req.get('user-agent') } });
  const token = await createToken(user.id, session.id, user.role);
  await prisma.$transaction([
    prisma.session.update({ where: { id: session.id }, data: { tokenHash: hashToken(token) } }),
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    prisma.auditLog.create({ data: { userId: user.id, action: 'LOGIN', entityType: 'User', entityId: user.id, ipAddress: req.ip } }),
  ]);
  res.cookie('pharmacy_session', token, cookieOptions);
  ok(res, { user: { id: user.id, name: user.name, phone: user.phone, role: user.role, permissions: rolePermissions[user.role] } });
});

authRouter.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.auth!.userId }, select: { id: true, name: true, phone: true, role: true } });
  ok(res, { user: { ...user, permissions: req.auth!.permissions } });
});

authRouter.post('/logout', authenticate, async (req, res) => {
  await prisma.$transaction([
    prisma.session.update({ where: { id: req.auth!.sessionId }, data: { revokedAt: new Date() } }),
    prisma.auditLog.create({ data: { userId: req.auth!.userId, action: 'LOGOUT', entityType: 'Session', entityId: req.auth!.sessionId } }),
  ]);
  res.clearCookie('pharmacy_session', { path: '/' });
  ok(res, { message: 'Signed out.' });
});

authRouter.post('/logout-all', authenticate, async (req, res) => {
  await prisma.session.updateMany({ where: { userId: req.auth!.userId, revokedAt: null }, data: { revokedAt: new Date() } });
  res.clearCookie('pharmacy_session', { path: '/' });
  ok(res, { message: 'All sessions revoked.' });
});
