import { AiActionConfig } from '@/types/ai';

export const STARTER_AI_ACTIONS: Omit<AiActionConfig, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Morning News Splash',
    description: 'Concise executive briefing of top global developments and technology headlines.',
    prompt:
      'Provide a sharp, executive morning news briefing for {date}. Highlight the top 3 global macro developments and top 3 major technology/industry stories. For each item, provide a bold headline, a 2-bullet factual summary, and a concise "Why it matters" takeaway.',
    outputFormat: 'markdown',
    requiresUserInput: false,
    researchEnabled: true,
    enabled: true,
    schemaVersion: 1,
  },
  {
    name: 'Daily Motivation & Mindset',
    description: 'An energizing quote, philosophical reflection, and practical daily focus challenge.',
    prompt:
      'Generate a focused mindset coaching reflection for {date} relating to our routine activity: "{routineTitle}". Provide: 1) A timeless quote from an inspiring thinker or practitioner, 2) A two-paragraph perspective on discipline, consistency, and maintaining momentum today, 3) One actionable micro-challenge to conquer before the day ends.',
    outputFormat: 'sections',
    requiresUserInput: false,
    researchEnabled: false,
    enabled: true,
    schemaVersion: 1,
  },
  {
    name: 'Guided Journal Writing',
    description: 'Reflective coaching, thoughtful inquiry, and mindset reframing based on your thoughts.',
    prompt:
      'Act as a compassionate, stoic personal journal coach. Based on my journal entry notes: "{userInput}", deliver: 1) A grounded reflection validating key emotions and accomplishments, 2) Three powerful Socratic questions to deepen self-awareness, 3) An empowering cognitive reframe or mantra for tomorrow.',
    outputFormat: 'markdown',
    requiresUserInput: true,
    userInputPlaceholder: 'What went well today? What was challenging or on your mind?',
    researchEnabled: false,
    enabled: true,
    schemaVersion: 1,
  },
  {
    name: 'Technology Learning Brief',
    description: 'Structured deep-dive on an engineering concept, architecture pattern, or tool.',
    prompt:
      'Explain the topic "{userInput}" with senior engineering clarity. Structure the breakdown into: 1) Core Concept & Purpose in plain English, 2) System Architecture & Key Components, 3) Trade-offs, Edge Cases & Performance Considerations, 4) A clear practical code snippet or architecture ASCII diagram, 5) Recommended next steps and industry best practices.',
    outputFormat: 'markdown',
    requiresUserInput: true,
    userInputPlaceholder: 'Enter technology, pattern, or library (e.g. WorkManager vs AlarmManager, Redis Caching, Raft Consensus)...',
    researchEnabled: true,
    enabled: true,
    schemaVersion: 1,
  },
];

export function getStarterTemplates(userId: string): AiActionConfig[] {
  const now = Date.now();
  return STARTER_AI_ACTIONS.map((starter, index) => ({
    ...starter,
    id: `starter_${index + 1}_${starter.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    userId,
    routineId: null,
    createdAt: now,
    updatedAt: now,
  }));
}

export function interpolatePrompt(
  promptTemplate: string,
  variables: {
    date?: string;
    routineTitle?: string;
    userInput?: string;
  }
): string {
  let result = promptTemplate;
  const dateVal = variables.date || new Date().toISOString().split('T')[0];
  const routineVal = variables.routineTitle || 'Daily Habit';
  const inputVal = (variables.userInput || '').trim();

  result = result.replace(/\{date\}/gi, dateVal);
  result = result.replace(/\{routineTitle\}/gi, routineVal);
  result = result.replace(/\{routine_title\}/gi, routineVal);
  result = result.replace(/\{userInput\}/gi, inputVal);
  result = result.replace(/\{user_input\}/gi, inputVal);

  return result;
}
