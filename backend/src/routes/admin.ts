import express, { Response } from 'express';
import { PrismaClient } from '../generated/prisma';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Generate random 7-character alphanumeric code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar looking chars (0,O,1,I)
  let code = '';
  for (let i = 0; i < 7; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// POST /api/admin/communities - Create a new community with pre-authorized manager
router.post('/communities', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const {
      organization,
      division,
      accountOwner,
      managerEmail
    } = req.body;

    // Validation
    if (!organization || !managerEmail || !accountOwner) {
      return res.status(400).json({
        success: false,
        error: 'Organization, manager email, and account manager are required'
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

    // Create community and generate invitation code in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create community
      const community = await tx.community.create({
        data: {
          organization,
          division: division || null,
          accountOwner,
          managerEmail: managerEmail.toLowerCase()
        }
      });

      // Generate random unique invitation code (used by both members and manager)
      // Manager is auto-assigned based on email match during registration
      let inviteCode = generateInviteCode();

      // Ensure code is unique
      let attempts = 0;
      while (attempts < 10) {
        const existing = await tx.invitation.findUnique({
          where: { code: inviteCode }
        });
        if (!existing) break;
        inviteCode = generateInviteCode();
        attempts++;
      }

      const invitationCode = await tx.invitation.create({
        data: {
          code: inviteCode,
          communityId: community.id,
          role: 'MEMBER',
          maxUses: 1000,
          active: true
        }
      });

      return { community, invitationCode };
    });

    res.status(201).json({
      success: true,
      community: result.community,
      invitationCode: result.invitationCode.code
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

    // Enhance communities with published profile counts
    const enhancedCommunities = await Promise.all(
      communities.map(async (community) => {
        const publishedCount = await prisma.user.count({
          where: {
            communityId: community.id,
            profilePublished: true
          }
        });

        return {
          ...community,
          _count: {
            ...community._count,
            publishedProfiles: publishedCount
          }
        };
      })
    );

    res.json({
      success: true,
      communities: enhancedCommunities
    });
  } catch (error) {
    console.error('Fetch communities error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch communities'
    });
  }
});

// GET /api/admin/communities/:id - Get single community with invitation codes
router.get('/communities/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const community = await prisma.community.findUnique({
      where: { id },
      include: {
        invitations: {
          select: {
            code: true,
            role: true,
            maxUses: true,
            usedCount: true
          }
        }
      }
    });

    if (!community) {
      return res.status(404).json({
        success: false,
        error: 'Community not found'
      });
    }

    // Get the invitation code (there should only be one)
    const invitationCode = community.invitations[0];

    res.json({
      success: true,
      community: {
        id: community.id,
        organization: community.organization,
        division: community.division,
        accountOwner: community.accountOwner,
        managerEmail: community.managerEmail
      },
      invitationCode: invitationCode?.code || ''
    });
  } catch (error) {
    console.error('Fetch community error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch community'
    });
  }
});

// PATCH /api/admin/communities/:id - Update community details
router.patch('/communities/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      organization,
      division,
      accountOwner,
      managerEmail
    } = req.body;

    // Validation
    if (!organization || !managerEmail || !accountOwner) {
      return res.status(400).json({
        success: false,
        error: 'Organization, manager email, and account manager are required'
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

    // Update community
    const updatedCommunity = await prisma.community.update({
      where: { id },
      data: {
        organization,
        division: division || null,
        accountOwner,
        managerEmail: managerEmail.toLowerCase()
      },
      include: {
        invitations: {
          select: {
            code: true,
            role: true
          }
        }
      }
    });

    // Get the invitation code (there should only be one)
    const invitationCode = updatedCommunity.invitations[0];

    res.json({
      success: true,
      community: {
        id: updatedCommunity.id,
        organization: updatedCommunity.organization,
        division: updatedCommunity.division,
        accountOwner: updatedCommunity.accountOwner,
        managerEmail: updatedCommunity.managerEmail
      },
      invitationCode: invitationCode?.code || ''
    });
  } catch (error) {
    console.error('Update community error:', error);

    if ((error as any).code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Community not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update community'
    });
  }
});

export default router;
