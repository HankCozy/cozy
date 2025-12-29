import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function publishProfile() {
  try {
    const email = 'john.doe@acme.com';

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { profilePublished: true },
    });

    console.log(`✅ Published profile for ${updatedUser.email}`);
    console.log(`   Role: ${updatedUser.role}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

publishProfile();
