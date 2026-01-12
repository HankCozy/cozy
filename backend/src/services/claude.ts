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
  style?: 'professional' | 'casual' | 'narrative';
  firstName?: string;
  lastName?: string;
}

/**
 * Generate a formatted profile summary from Q&A transcripts using Claude
 */
export async function generateProfileSummary(
  answers: QuestionAnswer[],
  options: ProfileGenerationOptions = {}
): Promise<string> {
  const { maxWords = 400, style = 'narrative', firstName, lastName } = options;
  const userName = firstName && lastName ? `${firstName} ${lastName}` : firstName || 'this person';

  // Group answers by section
  const sections = {
    identity: answers.filter((a) => a.sectionId === 'identity'),
    relationships: answers.filter((a) => a.sectionId === 'relationships'),
    lifestyle: answers.filter((a) => a.sectionId === 'lifestyle'),
    community: answers.filter((a) => a.sectionId === 'community'),
  };

  // Build the prompt with all Q&A data
  const prompt = `You are creating a community profile summary for ${userName} based on voice-recorded answers to profile questions.

CRITICAL INSTRUCTION: You MUST use the exact name "${userName}" throughout the profile. NEVER make up, invent, or hallucinate a different name. If no name is provided, refer to them as "they" or "this person" - but NEVER create a fictional name.

Here are ${firstName || 'the user'}'s answers organized by section:

${Object.entries(sections)
  .filter(([_, sectionAnswers]) => sectionAnswers.length > 0)
  .map(
    ([sectionName, sectionAnswers]) => `
## ${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)} Section

${sectionAnswers
  .map(
    (qa, i) => `
Q${i + 1}: ${qa.question}
A${i + 1}: ${qa.transcript}
`
  )
  .join('\n')}
`
  )
  .join('\n')}

FACTUAL ACCURACY REQUIREMENTS - READ CAREFULLY:

Your profile MUST be grounded ONLY in what ${firstName || 'the user'} explicitly stated in their answers. You may make MILD interpretive synthesis (e.g., describing someone as "nature-loving" if they mention hiking and camping), but you must NEVER invent or hallucinate new factual information.

STRICTLY FORBIDDEN - NEVER add these unless explicitly mentioned:
❌ Physical appearance (height, hair color, eye color, build, style, etc.)
❌ Specific locations not mentioned (cities, neighborhoods, countries, addresses)
❌ Jobs, titles, employers, or professional credentials not stated
❌ Accomplishments, awards, degrees, or achievements not described
❌ Family members or relationships not mentioned (children, siblings, parents, pets)
❌ Specific personality traits without clear evidence in their words
❌ Specific ages, dates, or timeframes not stated
❌ Medical conditions, dietary preferences, or lifestyle details not mentioned

ALLOWED - Mild synthesis based on clear evidence:
✅ Describing interests using interpretive language ("nature enthusiast" from multiple outdoor mentions)
✅ Capturing tone and energy from their speaking style
✅ Connecting themes they explicitly discuss
✅ Using evocative language to describe things they DID mention
✅ Inferring values from stories they tell

VERIFICATION CHECK - Before writing each sentence, ask yourself:
- "Did they actually say this, or am I assuming it?"
- "Can I point to specific words in their answers that support this?"
- If the answer is no, DO NOT write it.

Create a ${style} profile summary (approximately ${maxWords} words) that reads like a bio in a tech magazine or New York Times profile. Above all else, prioritize FACTUAL ACCURACY - every detail must be traceable to their actual words.

1. ALWAYS use "${userName}" (and only this exact name) throughout the profile - NEVER substitute or invent a different name
2. Make ${firstName || 'them'} sound interesting and authentic, but ONLY using details from their actual answers - never embellish or invent
3. Use their language as much as possible - capture their turns of phrase and pacing
4. Weave their actual answers into a cohesive narrative - you may connect themes and interpret tone, but never add facts they didn't mention
5. Highlight their personality, values, interests, and what makes them interesting
6. Make them approachable and relatable - don't be over the top or use superlatives
7. If they didn't mention something (appearance, job, location details), simply don't include it - silence is better than invention
8. Organize information naturally without rigid section headers

Write in third person using ${firstName || 'their'}'s name. Be warm, genuine, and grounded in their actual words.

EXAMPLES OF FORBIDDEN HALLUCINATIONS:

❌ BAD: "Sarah, a tall blonde with an infectious smile, works as a software engineer in Brooklyn..."
   (Unless she explicitly said she's tall, blonde, a software engineer, and lives in Brooklyn)

✅ GOOD: "Sarah brings a thoughtful perspective shaped by years of problem-solving work..."
   (If she mentioned problem-solving in her answers, but didn't specify her job title or location)

❌ BAD: "As a father of three who grew up in rural Montana..."
   (Unless he explicitly mentioned having three children and being from Montana)

✅ GOOD: "Family has always been central to his life, a theme that runs through many of his stories..."
   (If family was a recurring topic in his answers, without inventing specific details)

Remember: A shorter, accurate profile is VASTLY superior to a longer profile with invented details.

After the profile summary, add a blank line and then provide 3 thoughtful icebreaker questions that would help someone connect with ${firstName || 'this person'} based on their answers. Format them as:

---
**Icebreaker Questions:**
1. [First question based on their interests/values]
2. [Second question about something specific they mentioned]
3. [Third question that invites deeper conversation]

The primary goal is that this profile leads to real-world connections - help readers understand who ${firstName || 'this person'} truly is and why they'd want to meet them. Avoid generic statements or clichés.`;

  try {
    console.log('[Claude Service] Sending request to Claude API...');
    console.log('[Claude Service] Model: claude-3-opus-20240229');
    console.log('[Claude Service] Answers count:', answers.length);

    const message = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    console.log('[Claude Service] Response received successfully');

    // Extract text from response
    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in Claude response');
    }

    return textContent.text;
  } catch (error) {
    console.error('Claude API error:', error);
    throw new Error('Failed to generate profile summary');
  }
}
