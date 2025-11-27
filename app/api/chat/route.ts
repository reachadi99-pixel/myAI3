import {
  streamText,
  UIMessage,
  convertToModelMessages,
  stepCountIs,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type CoreSystemMessage,
} from 'ai';

import { MODEL, CAPABILITY_MESSAGE } from '@/config';
import {
  IDENTITY_PROMPT,
  TOOL_CALLING_PROMPT,
  TOOL_CALLING_OPTIONS,
  TOOL_CALLING_BEHAVIOR_RULES,
  TOOL_CALLING_FOLLOWUP_RULES_YES,
  TOOL_CALLING_FOLLOWUP_RULES_NO,
  TOOL_CALLING_OTHER_RULES,
  TONE_STYLE_PROMPT,
  GUARDRAILS_PROMPT,
  CITATIONS_PROMPT,
} from '@/prompts';

import { isContentFlagged } from '@/lib/moderation';
import { webSearch } from './tools/web-search';
import { vectorDatabaseSearch } from './tools/search-vector-database';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // --------------------------------------------------
  // MODERATION CHECK
  // --------------------------------------------------
  const latestUserMessage = messages.filter(m => m.role === 'user').pop();

  let textParts = '';
  if (latestUserMessage) {
    textParts = latestUserMessage.parts
      .filter(part => part.type === 'text')
      .map(part => ('text' in part ? part.text : ''))
      .join('');

    if (textParts) {
      const moderationResult = await isContentFlagged(textParts);

      if (moderationResult.flagged) {
        const stream = createUIMessageStream({
          execute({ writer }) {
            const id = 'moderation-denial-text';

            writer.write({ type: 'start' });
            writer.write({ type: 'text-start', id });
            writer.write({
              type: 'text-delta',
              id,
              delta:
                moderationResult.denialMessage ||
                "Your message violates our guidelines. I can't answer that.",
            });
            writer.write({ type: 'text-end', id });
            writer.write({ type: 'finish' });
          },
        });

        return createUIMessageStreamResponse({ stream });
      }
    }
  }

  // --------------------------------------------------
  // CAPABILITY INTERCEPT ("what do you do?" etc.)
  // --------------------------------------------------

  const capabilityTriggers = [
    "what do you do",
    "what can you do",
    "who are you",
    "help",
    "what is mb-ai",
    "what can you help me with"
  ];

  if (textParts && capabilityTriggers.some(q => textParts.toLowerCase().includes(q))) {
    const stream = createUIMessageStream({
      execute({ writer }) {
        const id = 'capability-text';

        writer.write({ type: 'start' });
        writer.write({ type: 'text-start', id });
        writer.write({ type: 'text-delta', id, delta: CAPABILITY_MESSAGE });
        writer.write({ type: 'text-end', id });
        writer.write({ type: 'finish' });
      },
    });

    return createUIMessageStreamResponse({ stream });
  }

  // --------------------------------------------------
  // SPLIT SYSTEM PROMPT INTO SMALLER INSTRUCTIONS
  // --------------------------------------------------
  const systemMessages: CoreSystemMessage[] = [
    { role: 'system', content: IDENTITY_PROMPT },
    { role: 'system', content: TOOL_CALLING_PROMPT },
    { role: 'system', content: TOOL_CALLING_OPTIONS },
    { role: 'system', content: TOOL_CALLING_BEHAVIOR_RULES },
    { role: 'system', content: TOOL_CALLING_FOLLOWUP_RULES_YES },
    { role: 'system', content: TOOL_CALLING_FOLLOWUP_RULES_NO },
    { role: 'system', content: TOOL_CALLING_OTHER_RULES },
    { role: 'system', content: TONE_STYLE_PROMPT },
    { role: 'system', content: GUARDRAILS_PROMPT },
    { role: 'system', content: CITATIONS_PROMPT },
  ];

  // --------------------------------------------------
  // MAIN EXECUTION
  // --------------------------------------------------
  const result = streamText({
    model: MODEL,
    messages: [
      ...systemMessages,
      ...convertToModelMessages(messages),
    ],
    tools: {
      webSearch,
      vectorDatabaseSearch,
    },
    stopWhen: stepCountIs(10),
    providerOptions: {
      openai: {
        reasoningSummary: 'auto',
        reasoningEffort: 'low',
        parallelToolCalls: false,
      },
    },
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
  });
}
