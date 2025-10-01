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
}

/**
 * Generate a formatted profile summary from Q&A transcripts using Claude
 */
export async function generateProfileSummary(
  answers: QuestionAnswer[],
  options: ProfileGenerationOptions = {}
): Promise<string> {
  const { maxWords = 400, style = 'narrative' } = options;

  // Group answers by section
  const sections = {
    identity: answers.filter((a) => a.sectionId === 'identity'),
    relationships: answers.filter((a) => a.sectionId === 'relationships'),
    lifestyle: answers.filter((a) => a.sectionId === 'lifestyle'),
    community: answers.filter((a) => a.sectionId === 'community'),
  };

  // Build the prompt with all Q&A data
  const prompt = `You are creating a community profile summary based on voice-recorded answers to profile questions.

Here are the user's answers organized by section:

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

Create a ${style} profile summary (approximately ${maxWords} words) that reads like a bio in a tech magazine or New York Times profile:

1. Make the person feel cool but authentic and real to their personal story
2. Use their language as much as possible - capture their turns of phrase and pacing
3. Synthesize their answers into a cohesive narrative that reveals their essence
4. Highlight their personality, values, interests, and what makes them interesting
5. Make them approachable and relatable - don't be over the top or use superlatives
6. Organize information naturally without rigid section headers

Write in third person. Be warm, genuine, and grounded in their actual words. The primary goal is that this profile leads to real-world connections - help readers understand who this person truly is and why they'd want to meet them. Avoid generic statements or clichés.`;

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
