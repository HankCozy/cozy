import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '../generated/prisma';

const router = express.Router();
const prisma = new PrismaClient();

// JWT middleware to extract user from token
interface AuthRequest extends Request {
  userId?: string;
  communityId?: string;
}

const authenticateToken = (req: AuthRequest, res: Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    req.userId = decoded.userId;
    req.communityId = decoded.communityId;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// GET /api/communities/members - Fetch all published profiles in user's community
router.get('/members', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { communityId } = req;

    if (!communityId) {
      return res.status(400).json({ error: 'Community ID not found' });
    }

    // Fetch all users in the same community with published profiles
    const members = await prisma.user.findMany({
      where: {
        communityId: communityId,
        profilePublished: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        profileSummary: true,
        profileAnswers: true,
        createdAt: true
      },
      orderBy: {
        firstName: 'asc'
      }
    });

    res.json({
      success: true,
      members
    });
  } catch (error) {
    console.error('Fetch community members error:', error);
    res.status(500).json({ error: 'Failed to fetch community members' });
  }
});

// GET /api/communities/members/:userId - Fetch specific user's full profile
router.get('/members/:userId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { communityId } = req;

    // Fetch user profile - must be published and in same community
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        communityId: communityId,
        profilePublished: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        profileSummary: true,
        profileAnswers: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found or profile not published' });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Fetch user profile error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

export default router;
