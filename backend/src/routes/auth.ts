import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '../generated/prisma';

const router = express.Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const SALT_ROUNDS = 12;

// Input validation helpers
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPassword = (password: string): boolean => {
  return password.length >= 12;
};

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ success: false, error: 'Invalid email format' });
      return;
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { community: true }
    });

    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    // Generate JWT token (include role, handle ADMIN users without communityId)
    const tokenPayload: any = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    // Only include communityId for non-ADMIN users
    if (user.role !== 'ADMIN' && user.communityId) {
      tokenPayload.communityId = user.communityId;
    }

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    // Return user data and token
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profilePictureUrl: user.profilePictureUrl,
        community: user.community ? {
          id: user.community.id,
          organization: user.community.organization,
          division: user.community.division,
          accountOwner: user.community.accountOwner
        } : undefined
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, invitationCode } = req.body;

    // Input validation
    if (!email || !password || !invitationCode) {
      res.status(400).json({ success: false, error: 'Email, password, and invitation code are required' });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ success: false, error: 'Invalid email format' });
      return;
    }

    if (!isValidPassword(password)) {
      res.status(400).json({ success: false, error: 'Password must be at least 12 characters' });
      return;
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      res.status(400).json({ success: false, error: 'Email already registered' });
      return;
    }

    // Validate invitation code
    const invitation = await prisma.invitation.findUnique({
      where: { code: invitationCode.toUpperCase() },
      include: { community: true }
    });

    if (!invitation) {
      res.status(400).json({ success: false, error: 'Invalid invitation code' });
      return;
    }

    if (!invitation.active) {
      res.status(400).json({ success: false, error: 'Invitation code is no longer active' });
      return;
    }

    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      res.status(400).json({ success: false, error: 'Invitation code has expired' });
      return;
    }

    if (invitation.usedCount >= invitation.maxUses) {
      res.status(400).json({ success: false, error: 'Invitation code has reached maximum uses' });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Check if email matches pre-authorized manager email for auto-assignment
    const userEmail = email.toLowerCase();
    const isPreAuthorizedManager = invitation.community.managerEmail?.toLowerCase() === userEmail;

    let assignedRole = invitation.role;
    let managedCommunityId = null;

    if (isPreAuthorizedManager) {
      // Override role to MANAGER and set up 1:1 relationship
      assignedRole = 'MANAGER';
      managedCommunityId = invitation.communityId;
    }

    // Create user and increment invitation usage in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: userEmail,
          passwordHash,
          firstName: firstName || null,
          lastName: lastName || null,
          role: assignedRole,
          communityId: invitation.communityId,
          managedCommunityId: managedCommunityId
        },
        include: { community: true }
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { usedCount: { increment: 1 } }
      });

      return newUser;
    });

    // Generate JWT token (include role, handle ADMIN users without communityId)
    const registerTokenPayload: any = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    // Only include communityId for non-ADMIN users
    if (user.role !== 'ADMIN' && user.communityId) {
      registerTokenPayload.communityId = user.communityId;
    }

    const token = jwt.sign(registerTokenPayload, JWT_SECRET, { expiresIn: '7d' });

    // Return user data and token
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profilePictureUrl: user.profilePictureUrl,
        community: user.community ? {
          id: user.community.id,
          organization: user.community.organization,
          division: user.community.division,
          accountOwner: user.community.accountOwner
        } : undefined
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;