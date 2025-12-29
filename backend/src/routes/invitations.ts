import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/invitations/validate
router.post('/validate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.body;

    if (!code) {
      res.status(400).json({ valid: false, error: 'Invitation code is required' });
      return;
    }

    // Find invitation
    const invitation = await prisma.invitation.findUnique({
      where: { code: code.toUpperCase() },
      include: { community: true }
    });

    if (!invitation) {
      res.json({ valid: false, error: 'Invalid invitation code' });
      return;
    }

    if (!invitation.active) {
      res.json({ valid: false, error: 'Invitation code is no longer active' });
      return;
    }

    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      res.json({ valid: false, error: 'Invitation code has expired' });
      return;
    }

    if (invitation.usedCount >= invitation.maxUses) {
      res.json({ valid: false, error: 'Invitation code has reached maximum uses' });
      return;
    }

    // Return valid invitation info
    res.json({
      valid: true,
      invitation: {
        role: invitation.role,
        community: {
          id: invitation.community.id,
          organization: invitation.community.organization,
          division: invitation.community.division,
          accountOwner: invitation.community.accountOwner
        }
      }
    });
  } catch (error) {
    console.error('Invitation validation error:', error);
    res.status(500).json({ valid: false, error: 'Internal server error' });
  }
});

export default router;