import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role } from '../generated/prisma';

const prisma = new PrismaClient();

// Extend Request interface to include auth properties
export interface AuthRequest extends Request {
  userId?: string;
  communityId?: string;
  userRole?: Role;
}

// JWT middleware to extract user from token
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    req.userId = decoded.userId;
    req.communityId = decoded.communityId; // May be undefined for ADMIN users
    req.userRole = decoded.role; // Extract role from JWT
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Role-based authorization middleware factory
export const requireRole = (allowedRoles: Role[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // If role is in JWT, use it for fast check
    if (req.userRole && allowedRoles.includes(req.userRole)) {
      return next();
    }

    // Fallback: Query database if role not in JWT or doesn't match
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { role: true }
      });

      if (!user || !allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      req.userRole = user.role; // Update request with role
      next();
    } catch (error) {
      console.error('Role authorization error:', error);
      return res.status(500).json({ error: 'Authorization failed' });
    }
  };
};

// Convenience middleware for admin-only endpoints
export const requireAdmin = requireRole(['ADMIN']);

// Convenience middleware for manager or admin endpoints
export const requireManagerOrAdmin = requireRole(['MANAGER', 'ADMIN']);
