import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Validate invitation code
export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Invitation code is required' },
        { status: 400 }
      );
    }

    // Find invitation
    const invitation = await prisma.invitation.findFirst({
      where: {
        code: code.toUpperCase(),
        status: 'PENDING',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: { community: { select: { name: true, description: true } } }
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation code' },
        { status: 400 }
      );
    }

    // Check if invitation has reached max uses
    if (invitation.maxUses && invitation.currentUses >= invitation.maxUses) {
      return NextResponse.json(
        { error: 'Invitation code has been fully used' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      invitation: {
        code: invitation.code,
        role: invitation.role,
        community: invitation.community,
        expiresAt: invitation.expiresAt,
        usesRemaining: invitation.maxUses ? invitation.maxUses - invitation.currentUses : null
      }
    });

  } catch (error) {
    console.error('Validate invitation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}