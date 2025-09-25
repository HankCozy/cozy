import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateJWT(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyJWT(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function generateInvitationCode(): string {
  // Use Web Crypto API instead of Node crypto for Edge Runtime compatibility
  const array = new Uint8Array(16);
  if (typeof window !== 'undefined') {
    crypto.getRandomValues(array);
  } else {
    // For Node.js environment (like during seed)
    const nodeCrypto = require('crypto');
    return nodeCrypto.randomBytes(16).toString('hex').toUpperCase();
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function generateSessionId(): string {
  // Use timestamp and random string for session ID
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `session_${timestamp}_${randomPart}`;
}