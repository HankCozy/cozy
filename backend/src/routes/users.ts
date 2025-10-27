import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '../generated/prisma';

const router = express.Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';

// Middleware to authenticate JWT token
interface AuthRequest extends Request {
  userId?: string;
  communityId?: string;
}

const authenticateToken = (req: AuthRequest, res: Response, next: express.NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; communityId: string };
    req.userId = decoded.userId;
    req.communityId = decoded.communityId;
    next();
  } catch (error) {
    res.status(403).json({ success: false, error: 'Invalid or expired token' });
    return;
  }
};

// PATCH /api/users/profile
// Update user's first name and last name
router.patch('/profile', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { firstName, lastName } = req.body;
    const userId = req.userId;

    // Input validation
    if (!firstName || !lastName) {
      res.status(400).json({ success: false, error: 'First name and last name are required' });
      return;
    }

    if (typeof firstName !== 'string' || typeof lastName !== 'string') {
      res.status(400).json({ success: false, error: 'First name and last name must be strings' });
      return;
    }

    if (firstName.trim().length === 0 || lastName.trim().length === 0) {
      res.status(400).json({ success: false, error: 'First name and last name cannot be empty' });
      return;
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim()
      },
      include: { community: true }
    });

    res.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        community: {
          id: updatedUser.community.id,
          name: updatedUser.community.name,
          description: updatedUser.community.description
        }
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

export default router;
