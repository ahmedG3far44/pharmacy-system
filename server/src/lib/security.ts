import { createHash, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { config } from '../config.js';

const key = new TextEncoder().encode(config.JWT_SECRET);
export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export const normalizePhone = (phone: string) => `+${phone.replace(/\D/g, '')}`;
export const createToken = (userId: string, sessionId: string, role: string) =>
  new SignJWT({ sid: sessionId, role, nonce: randomUUID() }).setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId).setIssuedAt().setExpirationTime('12h').sign(key);
export const verifyToken = (token: string) => jwtVerify(token, key);

