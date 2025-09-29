import { PrismaClient } from './generated/prisma';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create test communities
  const community1 = await prisma.community.create({
    data: {
      name: 'Test Community Alpha',
      description: 'A test community for development'
    }
  });

  const community2 = await prisma.community.create({
    data: {
      name: 'Test Community Beta',
      description: 'Another test community for development'
    }
  });

  // Create test invitations
  await prisma.invitation.create({
    data: {
      code: 'ALPHA2025',
      communityId: community1.id,
      role: 'MEMBER',
      maxUses: 10,
      usedCount: 0,
      active: true
    }
  });

  await prisma.invitation.create({
    data: {
      code: 'MANAGER01',
      communityId: community1.id,
      role: 'MANAGER',
      maxUses: 5,
      usedCount: 0,
      active: true
    }
  });

  await prisma.invitation.create({
    data: {
      code: 'BETA2025',
      communityId: community2.id,
      role: 'MEMBER',
      maxUses: 10,
      usedCount: 0,
      active: true
    }
  });

  // Create test user
  const hashedPassword = await bcrypt.hash('testpassword123', 12);
  await prisma.user.create({
    data: {
      email: 'test@example.com',
      passwordHash: hashedPassword,
      firstName: 'Test',
      lastName: 'User',
      role: 'MEMBER',
      communityId: community1.id
    }
  });

  console.log('✓ Database seeded successfully!');
  console.log('\nTest Credentials:');
  console.log('Email: test@example.com');
  console.log('Password: testpassword123');
  console.log('\nInvitation Codes:');
  console.log('- ALPHA2025 (Member for Test Community Alpha)');
  console.log('- MANAGER01 (Manager for Test Community Alpha)');
  console.log('- BETA2025 (Member for Test Community Beta)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });