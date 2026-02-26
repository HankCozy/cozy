import Anthropic from '@anthropic-ai/sdk';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
config({ path: '/Users/hankthornhill/Documents/GitHub/Cozy/backend/.env' });

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const rawData = JSON.parse(readFileSync('/tmp/members_check.json'));
const members = rawData.members;

function extractAnswers(profileAnswers) {
  if (!profileAnswers) return '';
  if (Array.isArray(profileAnswers)) {
    return profileAnswers.map(qa => `${qa.question}: ${qa.transcript}`).join('\n');
  }
  if (typeof profileAnswers === 'object') {
    return Object.entries(profileAnswers)
      .map(([_, answers]) => Array.isArray(answers) ? answers.map(qa => `${qa.question}: ${qa.transcript}`).join('\n') : '')
      .filter(Boolean).join('\n');
  }
  return String(profileAnswers);
}

const memberData = members.map((m, idx) => ({
  memberId: idx + 1,
  name: `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Anonymous',
  answers: extractAnswers(m.profileAnswers),
}));

console.log(`Members: ${memberData.length}`);
memberData.forEach(m => console.log(`  [${m.memberId}] ${m.name} — ${m.answers.length} chars`));

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
- ONLY use details they actually stated
- If no specific details available, use generic: "Enjoys birding" or "Shares this interest"
- NEVER invent timeframes, numbers, or details

## Output
CRITICAL: Output ONLY the raw JSON object below — no preamble, no explanation, no markdown.
Use the exact integer memberId values from the Member Profiles above.
{
  "circles": [
    {
      "id": "kebab-case-id",
      "name": "Circle Name",
      "members": [
        { "memberId": 1, "tagline": "Their contextual tagline" }
      ]
    }
  ]
}

Analyze the profiles and create meaningful circles now.`;

console.log('\nPrompt size:', prompt.length, 'chars');
console.log('Calling Claude...\n');

const start = Date.now();
const msg = await client.messages.create({
  model: 'claude-3-haiku-20240307',
  max_tokens: 2048,
  messages: [{ role: 'user', content: prompt }]
});

const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log(`Response in ${elapsed}s | stop_reason: ${msg.stop_reason} | output_tokens: ${msg.usage.output_tokens}`);

const rawText = msg.content[0].text.trim();
const jsonMatch = rawText.match(/\{[\s\S]*\}/);
const jsonText = jsonMatch ? jsonMatch[0] : rawText;

try {
  const parsed = JSON.parse(jsonText);
  console.log(`\nPARSED OK — ${parsed.circles.length} circles:`);
  parsed.circles.forEach(c => {
    const validMembers = c.members.filter(m => typeof m.memberId === 'number' && m.memberId >= 1 && m.memberId <= members.length);
    const resolved = validMembers.map(m => members[m.memberId - 1]);
    console.log(`  - ${c.name}: ${c.members.length} raw → ${validMembers.length} valid ${validMembers.length >= 3 ? '✓' : '✗ DROPPED'}`);
    resolved.forEach(r => console.log(`    * ${r.firstName} ${r.lastName}`));
  });
} catch(e) {
  console.log('JSON PARSE FAILED:', e.message);
  console.log('RAW:', rawText.slice(0, 500));
}
