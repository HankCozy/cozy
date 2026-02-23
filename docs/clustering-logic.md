# Circle Clustering Logic

This document defines the rules for AI-powered clustering of community members into interest-based circles.

## Overview

The clustering system analyzes member profile answers to group people with shared interests, life stages, and activities. Each community member can belong to multiple circles based on their profile content.

## Priority Hierarchy

Circles are prioritized by engagement potential:

| Priority | Type | Logic | Example |
|----------|------|-------|---------|
| P1 | Joint Action | "We are doing X together" | Woodworking Workshop, Book Club Readers |
| P2 | Niche Passion | "We both love this rare thing" | 1940s Noir Film Buffs, Vintage Radio Collectors |
| P3 | Shared Life-Stage | "We are going through X now" | First-time Grandparents, Empty Nesters |
| P4 | Service/Skill | "I can teach you X" | Tech Help for iPad Users, Knitting Mentors |

## Circle Constraints

### The "Do's"
- Every member belongs to the "All" circle automatically
- Each circle must have 3+ members (Rule of Three)
- Each user should see 2-8 circles total (excluding "All")
- Circle names should be specific and action-oriented
- Prioritize activity-based interests over passive consumption

### The "Don'ts"
- **No redundant labels**: Don't create "Seniors" circle in a retirement community
- **No static commonality**: Avoid circles without action potential (e.g., "People who like blue")
- **No trauma/illness-centered groups**: Avoid grouping by medical conditions without careful moderation
- **No opinion-only/political groups**: Avoid circles based purely on beliefs or politics
- **Suppress groups of 2**: Circles with only 2 potential members should be discarded

## AI Prompt Guidelines

When generating circles, the AI should:

1. **Extract interests from profile answers**: Look for hobbies, activities, passions, and life experiences mentioned in transcripts
2. **Identify action potential**: Prioritize interests where members could actually do something together
3. **Find specific overlaps**: "Bird Watching" is better than "Nature Lovers" if multiple people specifically mention birding
4. **Consider life stages**: New parents, retirees, career changers often have much to share
5. **Look for complementary skills**: One person wants to learn guitar, another teaches it

## Member Taglines

For each member in a circle, generate a contextual tagline that explains their connection to that circle:
- Use information from their profile answers
- Keep it brief (5-10 words)
- Make it conversational and warm

Examples:
- "12 years of birding experience"
- "Just getting started with watercolors"
- "Ran her first marathon last year"
- "Looking for hiking buddies"

## Output Format

The clustering service should return:

```typescript
{
  circles: [
    {
      id: string,           // kebab-case identifier
      name: string,         // Human-readable name
      members: [
        {
          userId: string,
          tagline: string   // Contextual connection to this circle
        }
      ]
    }
  ]
}
```

## Edge Cases

- **Small communities (< 5 members)**: Return only "All" circle with message about community growth
- **Sparse profiles**: Members with minimal profile data may only appear in "All"
- **No clear clusters**: If no strong interest overlaps exist, return fewer circles rather than weak ones
