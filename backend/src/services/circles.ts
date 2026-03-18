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
  shortName: string;
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
  profileSummary: string | null;
  matchScore: number;
  sharedTraits: string[];
  icebreakerQuestions: string[];
}

// In-memory cache for circles (per community)
const circlesCache = new Map<string, { data: CirclesResult; timestamp: number }>();
const CACHE_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

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

  // Use sequential indices instead of UUIDs so Claude can reliably copy them back
  const memberData = members.map((m, idx) => ({
    memberId: idx + 1,
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
- Do NOT combine different activities into one circle (hiking and gardening are separate interests)
- Each circle needs two labels:
  * \`name\` (shown in lists and detail views): A descriptive 2–5 word phrase, 10–30 characters. Balance achieved interests (active hobbies or skills members practice) with ascribed identity (who they are — their values, lifestyle, or shared character). Use "&" sparingly to connect the two sides. Good examples: "Woodworkers & Makers", "Trail Hikers", "Home Bakers & Hosts", "Garden Growers", "Avid Readers". Never include "Club", "Group", "Society", "Circle", "Community", or "Network".
  * \`shortName\` (shown inside a small bubble in a chart): 1–2 words, 4–16 characters. Prefer a natural plural noun form that describes who the members are (e.g., "Birders", "Hikers", "Woodworkers", "Bakers", "Readers", "Gardeners"). Do NOT invent words that don't exist naturally in English — if a concise noun form doesn't come naturally, use the first meaningful word of \`name\` instead. Never include "&", "and", "Club", "Group", "Society", "Circle", "Community", "Network", or "Enthusiasts".

TAGLINE RULES:
- Each member needs a 5-10 word tagline about their connection to that circle
- ONLY use details they actually stated (e.g., "12 years of birding" only if they said that)
- If no specific details available, use generic: "Enjoys birding" or "Shares this interest"
- NEVER invent timeframes, numbers, or details

## Output
CRITICAL: Output ONLY the raw JSON object below — no preamble, no explanation, no markdown.
Use the exact integer memberId values from the Member Profiles above.
{
  "circles": [
    {
      "id": "kebab-case-id",
      "name": "Woodworkers & Makers",
      "shortName": "Woodworkers",
      "members": [
        { "memberId": 1, "tagline": "Their contextual tagline" }
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

    // Extract JSON from response — handles prose preamble and markdown fences
    const rawText = textContent.text.trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[0] : rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const aiResult = JSON.parse(jsonText);

    // Index-based lookup: Claude outputs memberId (1-based), we map back to actual member
    const processedCircles: Circle[] = aiResult.circles.map((circle: any) => ({
      id: circle.id,
      name: circle.name,
      shortName: circle.shortName || circle.name,
      members: (circle.members as any[])
        .filter((cm) => typeof cm.memberId === 'number' && cm.memberId >= 1 && cm.memberId <= members.length)
        .map((cm) => {
          const member = members[cm.memberId - 1];
          return {
            userId: member.id,
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
    const reason = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error('[Circles] Generation failed, falling back to All circle. Reason:', reason);
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
    shortName: 'All',
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
 * Find icebreaker matches for a specific user.
 * Returns top 5 candidates with scores, then picks one via weighted random
 * (higher scores = higher probability) to ensure variety over time.
 * Members in excludeUserIds are excluded; falls back to full pool if all excluded.
 */
export async function findIcebreakerMatch(
  userId: string,
  userProfile: MemberProfile,
  communityMembers: MemberProfile[],
  excludeUserIds: string[] = []
): Promise<IcebreakerMatch | null> {
  // Start with members other than self, then apply exclude list
  const allOthers = communityMembers.filter((m) => m.id !== userId);
  if (allOthers.length === 0) return null;

  // Exclude recently-seen members, but fall back to full pool if everyone is excluded
  const candidates = allOthers.filter((m) => !excludeUserIds.includes(m.id));
  const pool = candidates.length > 0 ? candidates : allOthers;

  const userAnswers = extractAnswersForClustering(userProfile.profileAnswers);

  // Use sequential indices so Claude reliably copies them back
  const memberData = pool.map((m, idx) => ({
    memberId: idx + 1,
    name: `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Anonymous',
    answers: extractAnswersForClustering(m.profileAnswers),
  }));

  const prompt = `You are finding "Intersections" matches for a community member — serendipitous connections based on who they ARE, not just what they do.

## Current User
Name: ${userProfile.firstName || ''} ${userProfile.lastName || ''}
Profile Answers:
${userAnswers}

## Community Members
${JSON.stringify(memberData, null, 2)}

## Task
Find the top 5 members who share ASCRIBED traits with the current user. Ascribed traits are things people are born into or have accumulated over time:
- Hometown, region, or places they have lived
- Age or life stage (young professional, new parent, empty nester, retiree, etc.)
- Family situation (married, single, has kids, grandkids, caregiver, etc.)
- Tenure or seniority in their organization or community
- Cultural background or heritage mentioned
- Location or role within their organization

IMPORTANT: Prioritize genuine ascribed trait overlap. If clear overlap is absent, use random selection — do not force connections that aren't there. Serendipity is a valid outcome.

For each candidate provide:
- "sharedTraits": 1–2 short human-readable strings describing the ascribed connection (e.g. "Both raised in the South", "Both have young kids", "Similar tenure in the community"). Max 6 words each. Empty array if random fallback.
- "icebreakerQuestions": 3 questions that explore the ascribed connection or invite personal storytelling.

## Output
CRITICAL: Output ONLY the raw JSON object — no preamble, no explanation, no markdown.
Use the exact integer memberId values from the Community Members list above.
{
  "candidates": [
    {
      "memberId": 3,
      "matchScore": 0.85,
      "sharedTraits": ["Both raised in the Midwest", "Both have young children"],
      "icebreakerQuestions": [
        "What was it like growing up in the Midwest?",
        "What's the hardest and best part of being a parent right now?",
        "What do you miss most about where you grew up?"
      ]
    }
  ]
}`;

  const fallbackMember = pool[Math.floor(Math.random() * pool.length)];
  const fallbackResult: IcebreakerMatch = {
    userId: fallbackMember.id,
    firstName: fallbackMember.firstName || 'Unknown',
    lastName: fallbackMember.lastName || '',
    profileSummary: fallbackMember.profileSummary || null,
    matchScore: 0.5,
    sharedTraits: [],
    icebreakerQuestions: [
      "What brought you to this community?",
      "Where did you grow up, and what was it like?",
      "What's something most people here don't know about you?",
    ],
  };

  try {
    const message = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') return fallbackResult;

    // Extract JSON — handles prose preamble and markdown fences
    const rawText = textContent.text.trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallbackResult;

    const result = JSON.parse(jsonMatch[0]);
    const aiCandidates: Array<{
      memberId: number;
      matchScore: number;
      sharedInterests: string[];
      icebreakerQuestions: string[];
    }> = Array.isArray(result.candidates) ? result.candidates : [];

    // Map back via index, filter invalid entries
    const validCandidates = aiCandidates
      .filter((c) => typeof c.memberId === 'number' && c.memberId >= 1 && c.memberId <= pool.length)
      .map((c) => ({ ...c, member: pool[c.memberId - 1] }));

    if (validCandidates.length === 0) return fallbackResult;

    // Weighted random selection: probability ∝ matchScore
    const totalWeight = validCandidates.reduce((sum, c) => sum + (c.matchScore || 0.5), 0);
    let rand = Math.random() * totalWeight;
    let chosen = validCandidates[0];
    for (const c of validCandidates) {
      rand -= c.matchScore || 0.5;
      if (rand <= 0) {
        chosen = c;
        break;
      }
    }

    return {
      userId: chosen.member.id,
      firstName: chosen.member.firstName || 'Unknown',
      lastName: chosen.member.lastName || '',
      profileSummary: chosen.member.profileSummary || null,
      matchScore: chosen.matchScore || 0.7,
      sharedTraits: chosen.sharedTraits || [],
      icebreakerQuestions: chosen.icebreakerQuestions || [],
    };
  } catch (error) {
    console.error('[Circles] Icebreaker matching error:', error);
    return fallbackResult;
  }
}

/**
 * Get a specific circle by ID with full member details
 */
export function getCircleById(circlesResult: CirclesResult, circleId: string): Circle | null {
  return circlesResult.circles.find((c) => c.id === circleId) || null;
}
