import express, { Response } from 'express';
import { PrismaClient } from '../generated/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/communities/members - Fetch all published profiles in user's community
router.get('/members', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { communityId } = req;

    if (!communityId) {
      return res.status(400).json({ error: 'Community ID not found' });
    }

    // Fetch all users in the same community with published profiles
    // Filter to only show MEMBER users (exclude MANAGERs and ADMINs)
    const members = await prisma.user.findMany({
      where: {
        communityId: communityId,
        profilePublished: true,
        role: 'MEMBER'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        profileSummary: true,
        profileAnswers: true,
        profilePictureUrl: true,
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
        profilePictureUrl: true,
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
