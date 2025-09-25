import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, generateJWT } from '@/lib/auth';
import { UserRole } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const { email, password, firstName, lastName, invitationCode } = await req.json();

    if (!email || !password || !invitationCode) {
      return NextResponse.json(
        { error: 'Email, password, and invitation code are required' },
        { status: 400 }
      );
    }

    // Validate invitation code
    const invitation = await prisma.invitation.findFirst({
      where: {
        code: invitationCode,
        status: 'PENDING',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: { community: true }
    });

    // Additional check for max uses
    if (invitation && invitation.maxUses && invitation.currentUses >= invitation.maxUses) {
      return NextResponse.json(
        { error: 'Invitation code has reached maximum uses' },
        { status: 400 }
      );
    }

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation code' },
        { status: 400 }
      );
    }

    // Check if email is already registered
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 400 }
      );
    }

    // Create user
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        role: invitation.role,
        communityId: invitation.communityId,
      },
      include: {
        community: true
      }
    });

    // Update invitation usage
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        currentUses: { increment: 1 },
        status: invitation.maxUses && invitation.currentUses + 1 >= invitation.maxUses ? 'USED' : 'PENDING'
      }
    });

    // Create initial community profile
    await prisma.communityProfile.create({
      data: {
        userId: user.id,
        communityId: user.communityId,
      }
    });

    // Generate JWT token
    const token = generateJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
      communityId: user.communityId
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        community: user.community
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}