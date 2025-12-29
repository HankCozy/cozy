import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function setAdminPassword() {
  try {
    const adminEmail = 'clouduser@example.com';
    const newPassword = 'admin123456789'; // At least 12 characters

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update the admin user's password
    const updatedUser = await prisma.user.update({
      where: { email: adminEmail },
      data: { passwordHash },
    });

    console.log('✅ Admin password updated successfully!');
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Password: ${newPassword}`);
    console.log(`   Role: ${updatedUser.role}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setAdminPassword();
