import Anthropic from '@anthropic-ai/sdk';

// Debug: Check if API key is loaded
console.log('[Claude Service] API Key loaded:', process.env.ANTHROPIC_API_KEY ? 'YES (length: ' + process.env.ANTHROPIC_API_KEY.length + ')' : 'NO');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export interface QuestionAnswer {
  sectionId: string;
  question: string;
  transcript: string;
}

export interface ProfileGenerationOptions {
  maxWords?: number;
  style?: 'professional' | 'casual' | 'narrative' | 'snippet';
  firstName?: string;
  lastName?: string;
  pronouns?: string;
}

// Maps frontend sectionIds to readable display names in the prompt.
// Accepts both legacy backend IDs (identity, lifestyle) and current frontend IDs
// (intro_identity, interests) so the prompt is correct regardless of client version.
const SECTION_DISPLAY: Record<string, string> = {
  intro_identity: 'Identity & Background',
  interests: 'Interests & Hobbies',
  relationships: 'Relationships',
  community: 'Community',
  identity: 'Identity & Background',
  lifestyle: 'Interests & Hobbies',
};

// Patterns that indicate Claude returned a meta-response instead of a profile.
// These must never be saved as a user's profile summary.
const META_RESPONSE_PATTERNS = [
  /I don't see/i,
  /I'm ready to create/i,
  /could you please provide/i,
  /no answers (were )?included/i,
  /please provide.*answers/i,
  /I'd be happy to.*once you/i,
  /I cannot create.*without/i,
];

/**
 * Generate a formatted profile summary from Q&A transcripts using Claude
 */
export async function generateProfileSummary(
  answers: QuestionAnswer[],
  options: ProfileGenerationOptions = {}
): Promise<string> {
  const { maxWords = 400, style = 'narrative', firstName, lastName, pronouns } = options;
  const userName = firstName && lastName ? `${firstName} ${lastName}` : firstName || 'this person';

  // Group answers by whatever sectionIds arrive — no hardcoded section names.
  // This ensures intro_identity, interests, and any future sections are all included.
  const sectionGroups: Record<string, QuestionAnswer[]> = {};
  for (const answer of answers) {
    if (!sectionGroups[answer.sectionId]) sectionGroups[answer.sectionId] = [];
    sectionGroups[answer.sectionId].push(answer);
  }

  const answersBlock = Object.entries(sectionGroups)
    .map(([sectionId, sectionAnswers]) => {
      const displayName = SECTION_DISPLAY[sectionId] || sectionId;
      const qaLines = sectionAnswers
        .map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.transcript}`)
        .join('\n\n');
      return `## ${displayName}\n\n${qaLines}`;
    })
    .join('\n\n');

  const prompt = `Here are ${userName}'s voice-recorded answers to community profile questions. Use ONLY these answers to write the profile — nothing else.

CRITICAL INSTRUCTION: Use the exact name "${userName}" throughout. NEVER invent a different name.
PRONOUNS: Use "${pronouns || 'they/them'}" pronouns throughout without exception. NEVER mix pronoun sets or guess from the name.

---
${answersBlock}
---

FACTUAL ACCURACY — MANDATORY:

Ground every sentence in what ${firstName || 'the person'} explicitly said. Use their exact words and phrases wherever possible. Prefer direct quotation over paraphrase. When in doubt, quote — don't interpret.

STRICTLY FORBIDDEN (never add unless explicitly stated):
❌ Physical appearance (height, hair, build, style)
❌ Locations not mentioned (cities, neighborhoods, countries)
❌ Jobs, titles, or credentials not stated
❌ Accomplishments or awards not described
❌ Family members or relationships not mentioned
❌ Specific ages, dates, or timeframes not stated
❌ Any detail you cannot point to in their actual words

ALLOWED — only when clearly evidenced:
✅ Connecting themes they explicitly discuss
✅ Using their own turns of phrase to describe what they mentioned
✅ Mild synthesis ("outdoor enthusiast" if they mentioned hiking AND camping)

VERIFICATION: Before each sentence ask — "Did they actually say this?" If no, do not write it. A shorter, accurate profile is vastly better than a longer one with invented details.

FORMAT RULES:
- Begin directly with the first sentence — no title, no heading, no preamble
- No section headers or bold labels in the profile text
- Third person, using "${userName}"

Write a ${style === 'snippet' ? 'concise' : 'factual community'} profile (approximately ${maxWords} words) that represents ${firstName || 'them'} accurately in their own language.

${style !== 'snippet' ? `After the profile, add a blank line then 3 icebreaker questions grounded in what they actually said:

---
**Icebreaker Questions:**
1. [Question based on something they specifically mentioned]
2. [Question about a specific interest or value they expressed]
3. [Question that invites them to share more about something they brought up]` : `Keep it to ${maxWords} words or fewer.`}`;

  try {
    console.log('[Claude Service] Sending request to Claude API...');
    console.log('[Claude Service] Model: claude-sonnet-4-6');
    console.log('[Claude Service] Answers count:', answers.length);

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      temperature: 0,
      system:
        'You are a community profile writer. Your only function is to synthesize the provided Q&A answers into a grounded third-person profile. You never add information absent from the answers. You never respond with meta-commentary, clarifying questions, or task explanations. When answers are provided, you write the profile — nothing else.',
      messages: [{ role: 'user', content: prompt }],
    });

    console.log('[Claude Service] Response received successfully');

    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in Claude response');
    }

    // Reject meta-responses before they can be saved as a profile
    if (META_RESPONSE_PATTERNS.some((p) => p.test(textContent.text))) {
      console.error('[Claude Service] Meta-response detected — answers did not reach model:', textContent.text.slice(0, 200));
      throw new Error('Profile generation failed: model did not receive answer content');
    }

    return textContent.text;
  } catch (error) {
    console.error('Claude API error:', error);
    throw new Error('Failed to generate profile summary');
  }
}

/**
 * Extract interest tags from a profile summary using Claude
 */
export async function extractInterestTags(summary: string): Promise<string[]> {
  const prompt = `From the following community profile summary, extract 5-8 short interest or hobby tags.

Rules:
- Only include interests, hobbies, or passions that are explicitly mentioned in the text
- Tags should be 1-3 words, lowercase (e.g. "woodworking", "jazz music", "hiking")
- Do not invent or infer anything not clearly stated
- Return ONLY a JSON array of strings, no other text

Profile summary:
${summary}

Return format: ["tag1", "tag2", "tag3"]`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return [];
    }

    const parsed = JSON.parse(textContent.text.trim());
    if (Array.isArray(parsed)) {
      return parsed.filter((t) => typeof t === 'string').slice(0, 8);
    }
    return [];
  } catch (error) {
    console.error('Tag extraction error:', error);
    return [];
  }
}
