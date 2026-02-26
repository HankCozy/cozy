import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { validateProfileInput } from '../middleware/validation';
import { invalidateCirclesCache } from '../services/circles';

const router = express.Router();
const prisma = new PrismaClient();

// SECURITY: Validate JWT_SECRET is configured
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required');
}

// Initialize Supabase storage client with service role key (bypasses RLS)
const supabaseStorage = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

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
  } catch (_error) {
    res.status(403).json({ success: false, error: 'Invalid or expired token' });
    return;
  }
};

// PATCH /api/users/profile
// Update user's profile (name, summary, answers, published status)
// SECURITY: Validates and sanitizes input
router.patch('/profile', authenticateToken, validateProfileInput, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, profileSummary, profileAnswers, profilePublished, profilePictureUrl } = req.body;
    const userId = req.userId;

    // Build update data object with only provided fields
    const updateData: any = {};

    // Handle name updates (required if provided)
    if (firstName !== undefined || lastName !== undefined) {
      if (!firstName || !lastName) {
        res.status(400).json({ success: false, error: 'Both first name and last name are required when updating name' });
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

      updateData.firstName = firstName.trim();
      updateData.lastName = lastName.trim();
    }

    // Handle profile fields (optional)
    if (profileSummary !== undefined) {
      updateData.profileSummary = profileSummary;
    }

    if (profileAnswers !== undefined) {
      updateData.profileAnswers = profileAnswers;
    }

    if (profilePublished !== undefined) {
      updateData.profilePublished = profilePublished;
    }

    if (profilePictureUrl !== undefined) {
      updateData.profilePictureUrl = profilePictureUrl;
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { community: true }
    });

    // Invalidate circles cache when profile publish status changes or answers update
    // while the user is published — either affects who appears in circles and how
    const shouldInvalidate =
      profilePublished !== undefined ||
      (profileAnswers !== undefined && updatedUser.profilePublished);
    if (shouldInvalidate && updatedUser.communityId) {
      invalidateCirclesCache(updatedUser.communityId);
    }

    res.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        profilePictureUrl: updatedUser.profilePictureUrl,
        community: updatedUser.community ? {
          id: updatedUser.community.id,
          organization: updatedUser.community.organization,
          division: updatedUser.community.division,
          accountOwner: updatedUser.community.accountOwner
        } : null
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// POST /api/users/profile-picture
// Upload profile picture (authenticated users only)
router.post('/profile-picture', authenticateToken, upload.single('image'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;

    if (!req.file) {
      res.status(400).json({ success: false, error: 'No image file provided' });
      return;
    }

    // Upload to Supabase Storage using service role key (bypasses RLS)
    const fileName = `${userId}.jpg`;

    const { error: uploadError } = await supabaseStorage.storage
      .from('profile-pictures')
      .upload(fileName, req.file.buffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true, // Overwrite existing
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      res.status(500).json({ success: false, error: `Upload failed: ${uploadError.message}` });
      return;
    }

    // Update user's profilePictureUrl in database
    await prisma.user.update({
      where: { id: userId },
      data: { profilePictureUrl: 'uploaded' } // Flag that indicates picture exists
    });

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully'
    });
  } catch (error) {
    console.error('Profile picture upload error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload profile picture' });
  }
});

// GET /api/users/profile-picture/:userId
// Get signed URL for user's profile picture (community-scoped access)
router.get('/profile-picture/:userId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId: targetUserId } = req.params;
    const requestingUserCommunityId = req.communityId;

    // Fetch target user to verify they exist and get their community
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, communityId: true, profilePictureUrl: true }
    });

    if (!targetUser) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // Verify users are in the same community
    if (targetUser.communityId !== requestingUserCommunityId) {
      res.status(403).json({ success: false, error: 'Access denied: different community' });
      return;
    }

    // Check if user has a profile picture
    if (!targetUser.profilePictureUrl) {
      res.json({ success: true, signedUrl: null });
      return;
    }

    // Generate signed URL (valid for 1 hour)
    const fileName = `${targetUserId}.jpg`;

    const { data, error } = await supabaseStorage.storage
      .from('profile-pictures')
      .createSignedUrl(fileName, 3600); // 3600 seconds = 1 hour

    if (error) {
      console.error('Failed to generate signed URL:', error);
      res.status(500).json({ success: false, error: 'Failed to generate image URL' });
      return;
    }

    res.json({
      success: true,
      signedUrl: data.signedUrl
    });
  } catch (error) {
    console.error('Profile picture URL error:', error);
    res.status(500).json({ success: false, error: 'Failed to get profile picture' });
  }
});

// DELETE /api/users/account
// Delete user account (authenticated user can only delete their own account)
router.delete('/account', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    // Delete profile picture from Supabase storage (if exists)
    const fileName = `${userId}.jpg`;
    const { error: deleteError } = await supabaseStorage.storage
      .from('profile-pictures')
      .remove([fileName]);

    if (deleteError) {
      console.error('Profile picture deletion error:', deleteError);
      // Continue even if picture deletion fails (might not exist)
    }

    // Delete user from database
    await prisma.user.delete({
      where: { id: userId }
    });

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete account' });
  }
});

export default router;
