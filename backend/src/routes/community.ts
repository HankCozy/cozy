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

// GET /api/communities/circles/debug - Diagnose circles generation (temp)
router.get('/circles/debug', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { communityId } = req;
    if (!communityId) return res.status(400).json({ error: 'No communityId' });

    const members = await prisma.user.findMany({
      where: { communityId, profilePublished: true, role: 'MEMBER' },
      select: { id: true, firstName: true, lastName: true, profileSummary: true, profileAnswers: true }
    });

    const Anthropic = require('@anthropic-ai/sdk').default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const memberData = members.map((m: any) => {
      const answers = m.profileAnswers;
      let text = '';
      if (Array.isArray(answers)) {
        text = answers.map((a: any) => `${a.question}: ${a.transcript}`).join('\n');
      }
      return { id: m.id, name: `${m.firstName} ${m.lastName}`, answers: text.slice(0, 200) };
    });

    const prompt = `Group these ${members.length} members into interest circles. Return JSON: {"circles":[{"id":"id","name":"Name","members":[{"userId":"id","tagline":"tag"}]}]}. Only create circles for interests explicitly mentioned by 3+ members.\n\nMembers:\n${JSON.stringify(memberData)}`;

    const start = Date.now();
    let rawResponse = '';
    let parseError = '';
    let circlesFound: any[] = [];
    try {
      const msg = await client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }]
      });
      rawResponse = msg.content[0]?.text || '';
      const clean = rawResponse.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      const parsed = JSON.parse(clean);
      circlesFound = parsed.circles;
    } catch (e: any) {
      parseError = e.message;
    }

    res.json({
      memberCount: members.length,
      elapsed: Date.now() - start,
      rawResponse: rawResponse.slice(0, 1000),
      parseError,
      circlesFound: circlesFound.map((c: any) => ({ name: c.name, count: c.members?.length }))
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/communities/circles - Get circles for user's community
router.get('/circles', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { communityId, userId } = req;

    if (!communityId) {
      return res.status(400).json({ error: 'Community ID not found' });
    }

    // Check if user has published profile
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { profilePublished: true }
    });

    if (!currentUser?.profilePublished) {
      return res.status(403).json({
        error: 'Profile not published',
        message: 'Share your profile to unlock your circles'
      });
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
    const { communityId, userId } = req;

    if (!communityId) {
      return res.status(400).json({ error: 'Community ID not found' });
    }

    // Check if user has published profile
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { profilePublished: true }
    });

    if (!currentUser?.profilePublished) {
      return res.status(403).json({
        error: 'Profile not published',
        message: 'Share your profile to unlock your circles'
      });
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

// GET /api/communities/icebreaker - Get personalized icebreaker match
router.get('/icebreaker', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { communityId, userId } = req;

    if (!communityId || !userId) {
      return res.status(400).json({ error: 'Community ID or User ID not found' });
    }

    // Fetch current user's profile
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profileSummary: true,
        profileAnswers: true,
        profilePublished: true
      }
    });

    if (!currentUser?.profilePublished) {
      return res.status(403).json({
        error: 'Profile not published',
        message: 'Share your profile to get icebreaker matches'
      });
    }

    // Fetch all other published members
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
        profileAnswers: true
      }
    });

    if (otherMembers.length === 0) {
      return res.json({
        success: true,
        match: null,
        message: 'No other members with published profiles yet'
      });
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

    const match = await findIcebreakerMatch(userId, userProfile, memberProfiles);

    res.json({
      success: true,
      match
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
