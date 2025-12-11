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
  firstName?: string,
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
  const prompt = `You are a skilled narrative storyteller who writes warm, human-interest profiles about people living in senior communities. I will provide answers to the profile. Your task is to turn those responses into an engaging, magazine-style article that helps neighbors feel connected to this person.

${firstName ? `The person's first name is: ${firstName}\n\nIMPORTANT: Use "${firstName}" throughout the profile when referring to this person. Do NOT make up or invent a different name.\n` : ''}
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

TONE & VOICE:
- Friendly, welcoming, and conversational — like a lifestyle magazine or a resident-spotlight feature
- Write in third person
- Include short quotes from their answers where helpful
- Let personality shine — warmth, humor, passions, quirks
- Positive framing always; if personal challenges are mentioned, handle them gently and respectfully

STORYTELLING STRUCTURE:
Organize the narrative into 6–8 flowing paragraphs:
1. Warm Introduction — who they are, what they're like, and a quick glimpse of what makes them unique
2. Roots & Journey — where they were born/raised and places they've lived
3. Family & Connections — spouse/partner, children, grandchildren, pets — emphasize meaningful relationships
4. Free-Time Joys — hobbies, passions, weekend activities, favorite interests
5. Entertainment Tastes — what they watch, read, or listen to; any fandoms or favorite genres
6. Travel & Favorite Places — places they love or dream of visiting and why
7. Character & Reflection — what others say about them, influence in their life, what brings them joy, surprising facts, how they see themselves socially
8. Looking Ahead — what they value about being part of the community (referencing their response to Q15)

REQUIRED CONTENT RULES:
- Use every meaningful detail from the questionnaire
- Do not list answers in bullet form — blend them naturally into narrative
- When a direct quote adds personality, use it
- If an answer is short or sparse, keep it minimal — don't invent details

LENGTH: About 400–600 words — enough to feel rich and complete.

CLOSING SECTION:
After the narrative, include:

Conversation Starters:
3–5 friendly questions someone could ask this person to spark a connection.`;

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
