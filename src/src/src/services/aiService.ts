// src/services/aiService.ts
import supabase from './supabaseClient';
import type { PersonaDef, UserProfile, MemorySummary } from '../types';
import { getPersonaByKey } from '../data/personas';

// tiny fast hash to detect duplicates
function fnv1aHash(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return (h >>> 0).toString(16);
}

// simple similarity (Jaccard over words)
function similarity(a: string, b: string): number {
  const ta = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const tb = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
  const inter = new Set([...ta].filter((x) => tb.has(x))).size;
  const union = new Set([...ta, ...tb]).size || 1;
  return inter / union;
}

// Build strict, age-safe system prompt from persona + user + memory
export function buildSystemPrompt(
  persona: PersonaDef,
  user: UserProfile | null,
  memory: MemorySummary | null
): string {
  const age = user?.age ?? 13;
  const safety = [
    'Audience: ages 10–18. Be friendly, empowering, and concise.',
    'Do NOT give medical, legal, or mental-health advice. For health questions, offer general wellness tips only and suggest talking to a trusted adult.',
    'Recommend only public, vetted youth events with source names/links.',
    'Respect privacy; do not request sensitive personal data.',
  ];
  const memoryLines =
    memory?.highlights?.length ? `Recent highlights:\n- ${memory.highlights.join('\n- ')}` : '';

  return (
    `You are ${persona.name}, a youth mentor persona for the CHESS Companion Service.\n` +
    `Category: ${persona.category}. Tone: ${persona.tone}.\n` +
    `Backstory: ${persona.backstory}\n` +
    `Intro: ${persona.introPrompt}\n` +
    `Student profile: ${user?.display_name ?? 'unknown'} (age ${age}).\n` +
    `${memoryLines}\n` +
    `Rules:\n- ${safety.join('\n- ')}\n` +
    `Stay consistent with the backstory and speak as ${persona.name}.`
  );
}

// Call edge function `ai-chat`; auto-regenerate if reply is too similar to last
export async function generatePersonaReply(params: {
  conversationId: string;
  personaKey: PersonaDef['key'];
  message: string;
  userProfile: UserProfile | null;
  memorySummary: MemorySummary | null;
  lastReplyText?: string | null;
}): Promise<{ text: string; hash: string; regenerated: boolean }> {
  const persona = getPersonaByKey(params.personaKey);
  if (!persona) throw new Error('Unknown persona');

  const system = buildSystemPrompt(persona, params.userProfile, params.memorySummary);
  const lastHash = params.lastReplyText ? fnv1aHash(params.lastReplyText) : null;

  const invoke = async (variationHint?: string) => {
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        conversationId: params.conversationId,
        personaKey: params.personaKey,
        message: params.message,
        system,
        lastResponseHash: lastHash,
        variationHint,
      },
    });
    if (error) throw error;
    return (data?.text as string) ?? '';
  };

  let text = await invoke();
  let regenerated = false;

  if (params.lastReplyText) {
    const sim = similarity(text, params.lastReplyText);
    if (fnv1aHash(text) === lastHash || sim > 0.8) {
      text = await invoke('Vary wording and include a different concrete example (keep it brief).');
      regenerated = true;
    }
  }

  return { text, hash: fnv1aHash(text), regenerated };
}
