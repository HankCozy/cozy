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

  const prompt = `You are analyzing community member profiles to group people into interest-based "circles" for meaningful connections.

## Member Profiles
${JSON.stringify(memberData, null, 2)}

## CRITICAL: NO HALLUCINATION - STRICT GROUNDING RULES

You must ONLY create circles based on interests/activities that members EXPLICITLY mentioned in their profile answers.

### What counts as "explicitly mentioned":
- They used the exact word or a clear synonym (e.g., "birding", "bird watching", "I watch birds")
- They described doing the activity (e.g., "I hike every weekend", "I bake cookies")
- They expressed clear interest (e.g., "I love woodworking", "I'm passionate about gardening")

### What does NOT count:
- Inferred interests (e.g., assuming someone likes "nature" because they mentioned hiking once)
- Vague associations (e.g., grouping someone in "crafts" because they mentioned sewing once)
- Generalized categories that combine different activities
- Interests you think they MIGHT have based on other traits

### Clustering Constraints:
- Each circle MUST have at least 3 members who EXPLICITLY mentioned that specific interest
- Create 2-8 circles (not including "All")
- Circle names can be creative/engaging, but the underlying interest must be explicitly stated by all members
- Example: "Backyard Birding Club" is fine IF all members explicitly mentioned birding/bird watching
- Example: "Nature Lovers" is NOT okay if it groups hikers + gardeners + birders (different activities)
- If fewer than 3 people explicitly mentioned an interest, do NOT create that circle
- NO trauma/illness-centered groups
- NO opinion-only or political groups

### Priority for circle creation:
1. Activities multiple people explicitly said they DO (hiking, baking, woodworking)
2. Specific hobbies multiple people explicitly named (birding, photography, book clubs)
3. Life stages multiple people explicitly described (grandparents, empty nesters)

### CRITICAL - Tagline Rules (NO HALLUCINATION):
For each member in a circle, provide a contextual tagline that is STRICTLY grounded in their actual words:
- ONLY use facts, details, or phrases that appear in their profile answers
- If they said "I've been birding for 12 years", you can say "12 years of birding experience"
- If they said "just getting started with hiking", you can say "Just getting started"
- NEVER invent timeframes, experience levels, or details they didn't mention
- NEVER add specifics like years, numbers, or accomplishments unless explicitly stated
- When in doubt, use a GENERAL tagline like "Enjoys [activity]" or "Interested in [topic]"
- Keep taglines to 5-10 words
- If you cannot find specific details in their answers, use: "Shares this interest"

## Output Format
Return ONLY valid JSON (no markdown, no explanation) in this exact format:
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
