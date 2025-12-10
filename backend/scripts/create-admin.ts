import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // First, let's see what users exist
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        communityId: true,
      }
    });

    console.log('\n📋 Current users:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.role}) - ${user.firstName} ${user.lastName}`);
    });

    if (users.length === 0) {
      console.log('\n⚠️  No users found. Please register a user first.');
      return;
    }

    // Promote the first user to ADMIN
    const userToPromote = users[0];
    console.log(`\n🔧 Promoting ${userToPromote.email} to ADMIN...`);

    const updatedUser = await prisma.user.update({
      where: { id: userToPromote.id },
      data: {
        role: 'ADMIN',
        communityId: null, // Admins don't belong to communities
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Role: ${updatedUser.role}`);
    console.log(`   ID: ${updatedUser.id}`);
    console.log('\n🎉 You can now login as this admin user!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
