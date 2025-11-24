const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      profilePublished: true,
      profileSummary: true,
      profileAnswers: true,
    }
  });

  console.log('\n=== USER PROFILES IN DATABASE ===\n');
  users.forEach(user => {
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log(`Published: ${user.profilePublished}`);
    console.log(`Has Summary: ${user.profileSummary ? 'YES' : 'NO'}`);
    console.log(`Has Answers: ${user.profileAnswers ? 'YES' : 'NO'}`);
    console.log('---');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
