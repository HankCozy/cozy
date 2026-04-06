import express, { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import {
  getCirclesForCommunity,
  getCircleById,
  findIcebreakerMatch,
  invalidateCirclesCache,
  MemberProfile,
} from '../services/circles';

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
        profileInterests: true,
        circlesPublished: true,
        contactPublished: true,
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
        profileInterests: true,
        circlesPublished: true,
        contactPublished: true,
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

// GET /api/communities/circles - Get circles for user's community
router.get('/circles', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { communityId } = req;

    if (!communityId) {
      return res.status(400).json({ error: 'Community ID not found' });
    }

    // Fetch all published members in the community
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
        profileSummary: true,
        profileAnswers: true
      }
    });

    const MIN_ELIGIBLE = 5;
    if (members.length < MIN_ELIGIBLE) {
      return res.json({
        success: true,
        circles: [],
        insufficientMembers: true,
        eligibleCount: members.length,
        requiredCount: MIN_ELIGIBLE,
      });
    }

    const memberProfiles: MemberProfile[] = members.map(m => ({
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      profileAnswers: m.profileAnswers,
      profileSummary: m.profileSummary
    }));

    const circlesResult = await getCirclesForCommunity(communityId, memberProfiles);

    // Return simplified circles for overview
    const circlesOverview = circlesResult.circles.map(c => ({
      id: c.id,
      name: c.name,
      shortName: c.shortName,
      memberIds: c.members.map(m => m.userId),
      count: c.members.length
    }));

    res.json({
      success: true,
      circles: circlesOverview,
      generatedAt: circlesResult.generatedAt,
      expiresAt: circlesResult.expiresAt
    });
  } catch (error) {
    console.error('Fetch circles error:', error);
    res.status(500).json({ error: 'Failed to fetch circles' });
  }
});

// GET /api/communities/circles/:circleId - Get specific circle with members
router.get('/circles/:circleId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { circleId } = req.params;
    const { communityId } = req;

    if (!communityId) {
      return res.status(400).json({ error: 'Community ID not found' });
    }

    // Fetch all published members
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
        profileSummary: true,
        profileAnswers: true
      }
    });

    const memberProfiles: MemberProfile[] = members.map(m => ({
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      profileAnswers: m.profileAnswers,
      profileSummary: m.profileSummary
    }));

    const circlesResult = await getCirclesForCommunity(communityId, memberProfiles);
    const circle = getCircleById(circlesResult, circleId);

    if (!circle) {
      return res.status(404).json({ error: 'Circle not found' });
    }

    res.json({
      success: true,
      circle
    });
  } catch (error) {
    console.error('Fetch circle details error:', error);
    res.status(500).json({ error: 'Failed to fetch circle details' });
  }
});

// GET /api/communities/icebreaker - Get personalized member spotlight match
// Query params: ?exclude=userId1,userId2  (comma-separated IDs of recently seen members)
router.get('/icebreaker', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { communityId, userId } = req;

    if (!communityId || !userId) {
      return res.status(400).json({ error: 'Community ID or User ID not found' });
    }

    // Parse exclude list from query param
    const excludeParam = typeof req.query.exclude === 'string' ? req.query.exclude : '';
    const excludeUserIds = excludeParam ? excludeParam.split(',').filter(Boolean) : [];

    // Fetch current user's profile
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profileSummary: true,
        profileAnswers: true,
      }
    });

    // Fetch all other published members (include profilePictureUrl and profileInterests for the card)
    const otherMembers = await prisma.user.findMany({
      where: {
        communityId: communityId,
        profilePublished: true,
        role: 'MEMBER',
        id: { not: userId }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profileSummary: true,
        profileAnswers: true,
        profilePictureUrl: true,
        profileInterests: true,
      }
    });

    const MIN_ELIGIBLE = 5;
    // Count total eligible members including current user
    const totalEligible = otherMembers.length + 1;
    if (totalEligible < MIN_ELIGIBLE) {
      return res.json({
        success: true,
        match: null,
        insufficientMembers: true,
        eligibleCount: totalEligible,
        requiredCount: MIN_ELIGIBLE,
      });
    }

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userProfile: MemberProfile = {
      id: currentUser.id,
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
      profileAnswers: currentUser.profileAnswers,
      profileSummary: currentUser.profileSummary
    };

    const memberProfiles: MemberProfile[] = otherMembers.map(m => ({
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      profileAnswers: m.profileAnswers,
      profileSummary: m.profileSummary
    }));

    const match = await findIcebreakerMatch(userId, userProfile, memberProfiles, excludeUserIds);

    const matchedDbMember = match ? otherMembers.find(m => m.id === match.userId) : null;

    // Extract shortest answer as quote (prefer community section)
    const extractQuote = (profileAnswers: any): { text: string; question: string } | null => {
      if (!profileAnswers) return null;
      const answers = Array.isArray(profileAnswers) ? profileAnswers : [];
      const withT = answers.filter((a: any) => a.transcript?.trim().length > 0);
      if (withT.length === 0) return null;
      const community = withT.filter((a: any) => a.sectionId === 'community');
      const pool = community.length > 0 ? community : withT;
      const wc = (t: string) => t.trim().split(/\s+/).length;
      const shortest = pool.reduce((s: any, a: any) => !s || wc(a.transcript) < wc(s.transcript) ? a : s, null);
      if (!shortest) return null;
      const words = shortest.transcript.trim().split(/\s+/);
      return {
        text: words.slice(0, 20).join(' ') + (words.length > 20 ? '...' : ''),
        question: shortest.question,
      };
    };

    const quote = extractQuote(matchedDbMember?.profileAnswers);

    res.json({
      success: true,
      match: match ? {
        ...match,
        profilePictureUrl: matchedDbMember?.profilePictureUrl ?? null,
        profileInterests: Array.isArray(matchedDbMember?.profileInterests)
          ? matchedDbMember.profileInterests
          : [],
        quoteText: quote?.text ?? null,
        quoteQuestion: quote?.question ?? null,
      } : null
    });
  } catch (error) {
    console.error('Icebreaker match error:', error);
    res.status(500).json({ error: 'Failed to find icebreaker match' });
  }
});

// POST /api/communities/circles/invalidate - Invalidate circles cache
router.post('/circles/invalidate', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { communityId } = req;

    if (!communityId) {
      return res.status(400).json({ error: 'Community ID not found' });
    }

    invalidateCirclesCache(communityId);

    res.json({
      success: true,
      message: 'Circles cache invalidated'
    });
  } catch (error) {
    console.error('Invalidate circles cache error:', error);
    res.status(500).json({ error: 'Failed to invalidate cache' });
  }
});

export default router;
