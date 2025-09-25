import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateInvitationCode, verifyJWT } from '@/lib/auth';
import { UserRole } from '@prisma/client';

// Get all invitations for a community (managers only)
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyJWT(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is a manager
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Manager access required' }, { status: 403 });
    }

    // Get all invitations for this community
    const invitations = await prisma.invitation.findMany({
      where: { communityId: user.communityId },
      include: { creator: { select: { email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ invitations });

  } catch (error) {
    console.error('Get invitations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create new invitation (managers only)
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyJWT(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is a manager
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Manager access required' }, { status: 403 });
    }

    const { email, role, expiresAt, maxUses } = await req.json();

    // Validate role
    if (role && !Object.values(UserRole).includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Generate unique invitation code
    let code: string;
    let isUnique = false;
    do {
      code = generateInvitationCode();
      const existing = await prisma.invitation.findUnique({ where: { code } });
      isUnique = !existing;
    } while (!isUnique);

    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        code,
        email: email || null,
        role: role || 'MEMBER',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxUses: maxUses || null,
        communityId: user.communityId,
        createdBy: user.id
      },
      include: { creator: { select: { email: true, firstName: true, lastName: true } } }
    });

    return NextResponse.json({ invitation });

  } catch (error) {
    console.error('Create invitation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}