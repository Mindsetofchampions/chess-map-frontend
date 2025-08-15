import { PersonaDef, UserProfile, MemorySummary } from '../types';

/**
 * Build system prompt for AI personas with safety guidelines
 */
export function buildSystemPrompt(
  persona: PersonaDef,
  userProfile: UserProfile | null,
  memorySummary?: MemorySummary
): string {
  const age = userProfile?.age || 13;
  
  const safetyGuidelines = `
SAFETY GUARDRAILS:
- User is aged ${age} (assume 10-18 if not specified)
- NO medical, legal, or mental health advice
- Only recommend vetted, age-appropriate resources
- Encourage adult supervision for activities
- Promote positive, constructive interactions
- If asked about sensitive topics, redirect to trusted adults or resources
`;

  const personaContext = `
PERSONA: ${persona.name}
CATEGORY: ${persona.category}
TONE: ${persona.tone}
BACKSTORY: ${persona.backstory}
KEYWORDS: ${persona.keywords.join(', ')}
`;

  const userContext = userProfile ? `
USER CONTEXT:
- Role: ${userProfile.role}
- Display Name: ${userProfile.display_name || 'Student'}
- Organization: ${userProfile.org_id || 'None'}
` : '';

  const memoryContext = memorySummary ? `
CONVERSATION MEMORY:
- Recent topics: ${memorySummary.recentTopics.join(', ')}
- User preferences: ${memorySummary.userPreferences.join(', ')}
- Context: ${memorySummary.conversationContext}
- Highlights: ${memorySummary.highlights.join(', ')}
` : '';

  return `${safetyGuidelines}

${personaContext}

${userContext}

${memoryContext}

Stay in character as ${persona.name}. Be helpful, age-appropriate, and encouraging. Focus on educational content and positive development. Use the intro prompt as guidance for your personality: "${persona.introPrompt}"`;
}

/**
 * Simple similarity check using Jaccard similarity on tokens
 */
function tokenize(text: string): Set<string> {
  return new Set(
    text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2)
  );
}

function jaccardSimilarity(text1: string, text2: string): number {
  const tokens1 = tokenize(text1);
  const tokens2 = tokenize(text2);
  
  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
}

/**
 * Check if new response is too similar to last response
 */
export function checkResponseSimilarity(newResponse: string, lastResponse: string): boolean {
  // Check exact hash match first
  if (simpleHash(newResponse) === simpleHash(lastResponse)) {
    return true;
  }
  
  // Check Jaccard similarity
  const similarity = jaccardSimilarity(newResponse, lastResponse);
  return similarity > 0.8;
}

/**
 * Add variation instruction to prompt for de-duplication
 */
export function addVariationInstruction(originalPrompt: string): string {
  return `${originalPrompt}

IMPORTANT: Vary your response style and examples from your previous answer. Use different phrasing and approach the topic from a fresh angle while maintaining your persona.`;
}

// tiny fast hash to detect duplicates
function fnv1aHash(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16);
}