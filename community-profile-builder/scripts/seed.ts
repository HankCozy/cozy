import { PrismaClient } from '@prisma/client';
import { hashPassword, generateInvitationCode } from '../src/lib/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean up existing data
  await prisma.invitation.deleteMany({});
  await prisma.communityProfile.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.community.deleteMany({});

  console.log('🗑️  Cleaned existing data');

  // Create a test community
  const community = await prisma.community.create({
    data: {
      name: 'Test Community',
      description: 'A test community for development'
    }
  });

  console.log('✅ Created community:', community.name);

  // Create a test manager user
  const hashedPassword = await hashPassword('password123456');
  const manager = await prisma.user.create({
    data: {
      email: 'manager@test.com',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'Manager',
      role: 'MANAGER',
      communityId: community.id
    }
  });

  console.log('✅ Created manager user:', manager.email);

  // Create manager's profile
  await prisma.communityProfile.create({
    data: {
      userId: manager.id,
      communityId: community.id
    }
  });

  // Create a test member user
  const memberPassword = await hashPassword('member123456');
  const member = await prisma.user.create({
    data: {
      email: 'member@test.com',
      password: memberPassword,
      firstName: 'Test',
      lastName: 'Member',
      role: 'MEMBER',
      communityId: community.id
    }
  });

  console.log('✅ Created member user:', member.email);

  // Create member's profile
  await prisma.communityProfile.create({
    data: {
      userId: member.id,
      communityId: community.id
    }
  });

  // Create a few test invitation codes
  const memberInvitation = await prisma.invitation.create({
    data: {
      code: generateInvitationCode(),
      role: 'MEMBER',
      communityId: community.id,
      createdBy: manager.id
    }
  });

  const managerInvitation = await prisma.invitation.create({
    data: {
      code: generateInvitationCode(),
      role: 'MANAGER',
      communityId: community.id,
      createdBy: manager.id,
      maxUses: 1
    }
  });

  console.log('✅ Created invitation codes:');
  console.log('   Member invitation:', memberInvitation.code);
  console.log('   Manager invitation:', managerInvitation.code);

  console.log('\n🎉 Database seeded successfully!');
  console.log('\nYou can now:');
  console.log('1. Login as manager: manager@test.com / password123456');
  console.log('2. Login as member: member@test.com / member123456');
  console.log('3. Or register new users with invitation codes above');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });