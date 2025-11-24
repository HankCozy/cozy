const { PrismaClient } = require('./src/generated/prisma');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const fakeUsers = [
  {
    email: 'alice.johnson@example.com',
    password: 'password123456',
    firstName: 'Alice',
    lastName: 'Johnson',
    role: 'MEMBER',
    profileSummary: 'I\'m a product designer with a passion for creating intuitive user experiences. I love hiking on weekends and experimenting with new recipes in the kitchen. Currently learning to play the guitar and hoping to join a local band someday.',
    profileAnswers: [
      {
        sectionId: 'identity',
        question: 'What are three words that describe you?',
        transcript: 'Creative, empathetic, and curious. I\'m always looking for new ways to solve problems and connect with people.',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        sectionId: 'relationships',
        question: 'What do you value most in friendships?',
        transcript: 'Honesty and authenticity. I really appreciate when people can be themselves around me and share what\'s really going on in their lives.',
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        sectionId: 'lifestyle',
        question: 'What does a perfect weekend look like for you?',
        transcript: 'Starting with a morning hike, then brunch with friends. Afternoon would be spent working on a creative project or reading a good book.',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  },
  {
    email: 'bob.martinez@example.com',
    password: 'password123456',
    firstName: 'Bob',
    lastName: 'Martinez',
    role: 'MANAGER',
    profileSummary: 'Engineering manager with 10 years in tech. I believe in building strong teams through clear communication and mentorship. Outside work, I\'m an avid cyclist and coffee enthusiast. Always up for a good conversation about startups or sci-fi novels.',
    profileAnswers: [
      {
        sectionId: 'identity',
        question: 'What are you most proud of?',
        transcript: 'Building and leading teams that ship products people love. There\'s nothing better than seeing your team members grow and succeed.',
        timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        sectionId: 'community',
        question: 'How do you like to contribute to your community?',
        transcript: 'I mentor junior engineers and organize local tech meetups. It\'s rewarding to help others navigate their career paths.',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        sectionId: 'lifestyle',
        question: 'What\'s your favorite way to unwind?',
        transcript: 'Long bike rides on the weekend. There\'s something meditative about being on the road with just your thoughts.',
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  },
  {
    email: 'sarah.chen@example.com',
    password: 'password123456',
    firstName: 'Sarah',
    lastName: 'Chen',
    role: 'MEMBER',
    profileSummary: 'Marketing strategist by day, amateur photographer by night. I have a knack for storytelling and love finding the human angle in everything. When I\'m not working, you\'ll find me exploring new neighborhoods with my camera or trying out the latest brunch spots.',
    profileAnswers: [
      {
        sectionId: 'identity',
        question: 'What motivates you?',
        transcript: 'Stories. I love discovering what makes people tick and finding ways to share those stories with others.',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        sectionId: 'relationships',
        question: 'What makes you feel connected to others?',
        transcript: 'Deep conversations over coffee. Small talk is fine, but I really light up when we get into meaningful topics.',
        timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        sectionId: 'lifestyle',
        question: 'What\'s something you\'ve been wanting to learn?',
        transcript: 'I\'ve been wanting to learn more about sustainable living. Trying to reduce my carbon footprint one habit at a time.',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        sectionId: 'community',
        question: 'What does community mean to you?',
        transcript: 'Having a group of people you can count on, who celebrate your wins and support you through challenges.',
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  }
];

async function main() {
  console.log('Creating fake users with profile data...\n');

  // Get the Test Community Alpha
  const community = await prisma.community.findFirst({
    where: { organization: 'Test Community Alpha' }
  });

  if (!community) {
    console.error('❌ Test Community Alpha not found. Run seed first.');
    return;
  }

  for (const userData of fakeUsers) {
    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        passwordHash: passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        communityId: community.id,
        profileSummary: userData.profileSummary,
        profileAnswers: userData.profileAnswers,
        profilePublished: true
      }
    });

    console.log(`✅ Created ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`   - Role: ${user.role}`);
    console.log(`   - Profile Published: ${user.profilePublished}`);
    console.log(`   - Answers: ${userData.profileAnswers.length}`);
    console.log('');
  }

  console.log('🎉 All fake users created successfully!\n');
  console.log('Test Credentials (all users):');
  console.log('Password: password123456\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
