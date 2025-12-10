import express, { Response } from 'express';
import { PrismaClient } from '../generated/prisma';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/admin/communities - Create a new community with pre-authorized manager
router.post('/communities', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const {
      organization,
      division,
      accountOwner,
      managerEmail,
      memberInviteCodePrefix
    } = req.body;

    // Validation
    if (!organization || !managerEmail || !memberInviteCodePrefix) {
      return res.status(400).json({
        success: false,
        error: 'Organization, manager email, and invite code prefix are required'
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(managerEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid manager email format'
      });
    }

    // Create community and generate invitation codes in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create community
      const community = await tx.community.create({
        data: {
          organization,
          division: division || null,
          accountOwner: accountOwner || null,
          managerEmail: managerEmail.toLowerCase()
        }
      });

      // Generate member invitation code (high maxUses for member signups)
      const memberCode = await tx.invitation.create({
        data: {
          code: `${memberInviteCodePrefix}_MEMBER`.toUpperCase(),
          communityId: community.id,
          role: 'MEMBER',
          maxUses: 1000,
          active: true
        }
      });

      // Generate manager invitation code (maxUses: 1 for single manager)
      const managerCode = await tx.invitation.create({
        data: {
          code: `${memberInviteCodePrefix}_MGR`.toUpperCase(),
          communityId: community.id,
          role: 'MEMBER', // Will be overridden by email check during registration
          maxUses: 1,
          active: true
        }
      });

      return { community, memberCode, managerCode };
    });

    res.status(201).json({
      success: true,
      community: result.community,
      invitationCodes: {
        member: result.memberCode.code,
        manager: result.managerCode.code
      }
    });
  } catch (error) {
    console.error('Create community error:', error);

    // Handle unique constraint violations
    if ((error as any).code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: 'Invitation code already exists. Please use a different prefix.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create community'
    });
  }
});

// GET /api/admin/communities - List all communities (admin only)
router.get('/communities', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const communities = await prisma.community.findMany({
      include: {
        manager: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        _count: {
          select: {
            users: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      communities
    });
  } catch (error) {
    console.error('Fetch communities error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch communities'
    });
  }
});

export default router;
