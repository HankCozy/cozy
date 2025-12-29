import express, { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireManagerOrAdmin, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/manager/stats - Get member profile completion statistics for manager's community
router.get('/stats', authenticateToken, requireManagerOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { communityId, userId } = req;

    // Verify user is manager of this community (or admin)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { managedCommunity: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // For MANAGERs, verify they're the manager of the requested community
    // For ADMINs, allow access to any community stats
    let targetCommunityId = communityId;

    if (user.role === 'MANAGER') {
      if (!user.managedCommunityId) {
        return res.status(403).json({
          success: false,
          error: 'Manager not assigned to any community'
        });
      }
      targetCommunityId = user.managedCommunityId;
    } else if (user.role === 'ADMIN') {
      // Admin can view any community, but needs communityId parameter
      const requestedCommunityId = req.query.communityId as string;
      if (requestedCommunityId) {
        targetCommunityId = requestedCommunityId;
      } else if (!targetCommunityId) {
        return res.status(400).json({
          success: false,
          error: 'Community ID required for admin stats access'
        });
      }
    }

    if (!targetCommunityId) {
      return res.status(400).json({
        success: false,
        error: 'Community ID not found'
      });
    }

    // Fetch member statistics (exclude MANAGERs and ADMINs)
    const members = await prisma.user.findMany({
      where: {
        communityId: targetCommunityId,
        role: 'MEMBER'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profilePublished: true,
        profileAnswers: true,
        createdAt: true
      }
    });

    // Calculate completion stats for each member
    const TOTAL_QUESTIONS = 4; // Update this if question count changes

    const memberStats = members.map(member => {
      const answersData = member.profileAnswers as any;
      const answerCount = answersData ? Object.keys(answersData).filter(key => answersData[key]).length : 0;
      const completionPercentage = Math.round((answerCount / TOTAL_QUESTIONS) * 100);

      return {
        id: member.id,
        name: `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email,
        email: member.email,
        profilePublished: member.profilePublished,
        questionsAnswered: answerCount,
        completionPercentage,
        joinedDate: member.createdAt
      };
    });

    // Calculate aggregate statistics
    const totalMembers = members.length;
    const publishedProfiles = members.filter(m => m.profilePublished).length;
    const averageCompletion = totalMembers > 0
      ? Math.round(memberStats.reduce((sum, m) => sum + m.completionPercentage, 0) / totalMembers)
      : 0;

    res.json({
      success: true,
      stats: {
        totalMembers,
        publishedProfiles,
        averageCompletion,
        members: memberStats
      }
    });
  } catch (error) {
    console.error('Fetch manager stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch member statistics'
    });
  }
});

export default router;
