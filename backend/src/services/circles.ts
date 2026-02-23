import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Types
export interface MemberProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  profileAnswers: any;
  profileSummary: string | null;
}

export interface CircleMember {
  userId: string;
  firstName: string;
  lastName: string;
  tagline: string;
}

export interface Circle {
  id: string;
  name: string;
  members: CircleMember[];
}

export interface CirclesResult {
  circles: Circle[];
  generatedAt: string;
  expiresAt: string;
}

export interface IcebreakerMatch {
  userId: string;
  firstName: string;
  lastName: string;
  matchScore: number;
  sharedInterests: string[];
  icebreakerQuestions: string[];
}

// In-memory cache for circles (per community)
const circlesCache = new Map<string, { data: CirclesResult; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get circles for a community, using cache if available
 */
export async function getCirclesForCommunity(
  communityId: string,
  members: MemberProfile[],
  forceRefresh = false
): Promise<CirclesResult> {
  const cacheKey = `circles:${communityId}`;
  const now = Date.now();

  // Check cache unless force refresh
  if (!forceRefresh) {
    const cached = circlesCache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      console.log('[Circles] Returning cached circles for community:', communityId);
      return cached.data;
    }
  }

  // Generate new circles
  console.log('[Circles] Generating new circles for community:', communityId);
  const result = await generateCircles(members);

  // Cache the result
  circlesCache.set(cacheKey, { data: result, timestamp: now });

  return result;
}

/**
 * Invalidate circles cache for a community
 */
export function invalidateCirclesCache(communityId: string): void {
  const cacheKey = `circles:${communityId}`;
  circlesCache.delete(cacheKey);
  console.log('[Circles] Cache invalidated for community:', communityId);
}

/**
 * Generate circles using Claude AI
 */
async function generateCircles(members: MemberProfile[]): Promise<CirclesResult> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CACHE_TTL_MS);

  // Handle small communities
  if (members.length < 5) {
    return {
      circles: [createAllCircle(members)],
      generatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  }

  // Prepare member data for AI
  const memberData = members.map((m) => ({
    id: m.id,
    name: `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Anonymous',
    answers: extractAnswersForClustering(m.profileAnswers),
  }));

  const prompt = `Group these community members into interest-based circles.

## Member Profiles
${JSON.stringify(memberData, null, 2)}

## Rules

GROUNDING REQUIREMENT: Only create circles for interests members EXPLICITLY stated. If someone said "I love birding" or "I hike every weekend", that counts. Do NOT infer interests they didn't mention.

CIRCLE RULES:
- Create 2-8 circles based on shared interests explicitly mentioned by 3+ members
- Circle names can be creative (e.g., "Backyard Birding Club") but all members must have explicitly mentioned that interest
- Do NOT combine different activities into one circle (hiking and gardening are separate interests)

TAGLINE RULES:
- Each member needs a 5-10 word tagline about their connection to that circle
- ONLY use details they actually stated (e.g., "12 years of birding" only if they said that)
- If no specific details available, use generic: "Enjoys birding" or "Shares this interest"
- NEVER invent timeframes, numbers, or details

## Output
Return ONLY valid JSON:
{
  "circles": [
    {
      "id": "kebab-case-id",
      "name": "Circle Name",
      "members": [
        { "userId": "user-id-here", "tagline": "Their contextual tagline" }
      ]
    }
  ]
}

Analyze the profiles and create meaningful circles now.`;

  try {
    console.log('[Circles] Sending clustering request to Claude API...');

    const message = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in Claude response');
    }

    // Parse AI response
    const aiResult = JSON.parse(textContent.text);

    // Build full member data for circles
    const memberMap = new Map(members.map((m) => [m.id, m]));
    const processedCircles: Circle[] = aiResult.circles.map((circle: any) => ({
      id: circle.id,
      name: circle.name,
      members: circle.members
        .filter((cm: any) => memberMap.has(cm.userId))
        .map((cm: any) => {
          const member = memberMap.get(cm.userId)!;
          return {
            userId: cm.userId,
            firstName: member.firstName || 'Unknown',
            lastName: member.lastName || '',
            tagline: cm.tagline,
          };
        }),
    }));

    // Filter out circles with fewer than 3 members
    const validCircles = processedCircles.filter((c) => c.members.length >= 3);

    // Always include "All" circle
    const allCircle = createAllCircle(members);

    return {
      circles: [allCircle, ...validCircles],
      generatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error) {
    console.error('[Circles] Claude API error:', error);
    // Fallback to just "All" circle
    return {
      circles: [createAllCircle(members)],
      generatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  }
}

/**
 * Create the "All" circle containing all members
 */
function createAllCircle(members: MemberProfile[]): Circle {
  return {
    id: 'all',
    name: 'All',
    members: members.map((m) => ({
      userId: m.id,
      firstName: m.firstName || 'Unknown',
      lastName: m.lastName || '',
      tagline: 'Community member',
    })),
  };
}

/**
 * Extract relevant text from profile answers for clustering
 */
function extractAnswersForClustering(profileAnswers: any): string {
  if (!profileAnswers) return '';

  try {
    // Handle both array and object formats
    if (Array.isArray(profileAnswers)) {
      return profileAnswers
        .map((qa: any) => `${qa.question}: ${qa.transcript}`)
        .join('\n');
    }

    // Handle object format with sections
    if (typeof profileAnswers === 'object') {
      return Object.entries(profileAnswers)
        .map(([section, answers]: [string, any]) => {
          if (Array.isArray(answers)) {
            return answers.map((qa: any) => `${qa.question}: ${qa.transcript}`).join('\n');
          }
          return '';
        })
        .filter(Boolean)
        .join('\n');
    }

    return String(profileAnswers);
  } catch {
    return '';
  }
}

/**
 * Find icebreaker matches for a specific user
 */
export async function findIcebreakerMatch(
  userId: string,
  userProfile: MemberProfile,
  communityMembers: MemberProfile[]
): Promise<IcebreakerMatch | null> {
  // Filter out the current user
  const otherMembers = communityMembers.filter((m) => m.id !== userId);

  if (otherMembers.length === 0) {
    return null;
  }

  const userAnswers = extractAnswersForClustering(userProfile.profileAnswers);

  const prompt = `You are finding the best connection match for a community member.

## Current User
Name: ${userProfile.firstName || ''} ${userProfile.lastName || ''}
Profile Answers:
${userAnswers}

## Other Community Members
${otherMembers
  .map(
    (m) => `
ID: ${m.id}
Name: ${m.firstName || ''} ${m.lastName || ''}
Profile Answers:
${extractAnswersForClustering(m.profileAnswers)}
---`
  )
  .join('\n')}

## Task
Find the SINGLE best match for the current user based on:
1. Shared interests and hobbies
2. Similar life experiences or stages
3. Complementary skills (one can teach, other wants to learn)
4. Potential for meaningful conversation

## Output Format
Return ONLY valid JSON (no markdown, no explanation):
{
  "matchUserId": "the-best-match-user-id",
  "matchScore": 0.85,
  "sharedInterests": ["interest1", "interest2"],
  "icebreakerQuestions": [
    "Question they could ask this person?",
    "Another conversation starter?",
    "A third icebreaker question?"
  ]
}

Provide 3 specific, personalized icebreaker questions based on their shared interests.`;

  try {
    const message = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return null;
    }

    const result = JSON.parse(textContent.text);
    const matchedMember = otherMembers.find((m) => m.id === result.matchUserId);

    if (!matchedMember) {
      // Fallback to random member if AI response is invalid
      const randomMember = otherMembers[Math.floor(Math.random() * otherMembers.length)];
      return {
        userId: randomMember.id,
        firstName: randomMember.firstName || 'Unknown',
        lastName: randomMember.lastName || '',
        matchScore: 0.5,
        sharedInterests: [],
        icebreakerQuestions: [
          "What brought you to this community?",
          "What do you enjoy doing in your free time?",
          "What's something you've been wanting to learn?"
        ],
      };
    }

    return {
      userId: matchedMember.id,
      firstName: matchedMember.firstName || 'Unknown',
      lastName: matchedMember.lastName || '',
      matchScore: result.matchScore || 0.7,
      sharedInterests: result.sharedInterests || [],
      icebreakerQuestions: result.icebreakerQuestions || [],
    };
  } catch (error) {
    console.error('[Circles] Icebreaker matching error:', error);
    // Fallback to random member
    const randomMember = otherMembers[Math.floor(Math.random() * otherMembers.length)];
    return {
      userId: randomMember.id,
      firstName: randomMember.firstName || 'Unknown',
      lastName: randomMember.lastName || '',
      matchScore: 0.5,
      sharedInterests: [],
      icebreakerQuestions: [
        "What brought you to this community?",
        "What do you enjoy doing in your free time?",
        "What's something you've been wanting to learn?"
      ],
    };
  }
}

/**
 * Get a specific circle by ID with full member details
 */
export function getCircleById(circlesResult: CirclesResult, circleId: string): Circle | null {
  return circlesResult.circles.find((c) => c.id === circleId) || null;
}
