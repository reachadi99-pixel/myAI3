import {
  streamText,
  UIMessage,
  convertToModelMessages,
  stepCountIs,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type CoreSystemMessage,
} from "ai";

import { MODEL } from "@/config";
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
} from "@/prompts";

import { isContentFlagged } from "@/lib/moderation";
import { webSearch } from "./tools/web-search";
import { vectorDatabaseSearch } from "./tools/search-vector-database";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // --------------------------------------------------
  // MODERATION CHECK
  // --------------------------------------------------
  const latestUserMessage = messages.filter((m) => m.role === "user").pop();

  if (latestUserMessage) {
    const textParts = latestUserMessage.parts
      .filter((part) => part.type === "text")
      .map((part) => ("text" in part ? part.text : ""))
      .join("");

    if (textParts) {
      const moderationResult = await isContentFlagged(textParts);

      if (moderationResult.flagged) {
        const stream = createUIMessageStream({
          execute({ writer }) {
            const id = "moderation-denial-text";

            writer.write({ type: "start" });
            writer.write({ type: "text-start", id });

            writer.write({
              type: "text-delta",
              id,
              delta:
                moderationResult.denialMessage ||
                "Your message violates our guidelines. I can't answer that.",
            });

            writer.write({ type: "text-end", id });
            writer.write({ type: "finish" });
          },
        });

        return createUIMessageStreamResponse({ stream });
      }
    }
  }

  // --------------------------------------------------
  // SYSTEM PROMPTS (general + comparison-specific)
  // --------------------------------------------------

  const MBA_COMPARISON_PROMPT = `
You are an MBA/B-school comparison assistant.

COMPARISON MODE TRIGGER
- If a user message contains the word "compare" and at least two college names, treat the request as "comparison mode".

GOAL
- In comparison mode, your goal is to compare the requested colleges on the requested parameters using the best available data for the 2024 batch.
- The user does NOT see these instructions. Keep their chat experience natural and concise.

DATA PRIORITY
1) You MUST always try to use data for the 2024 batch (or "Class of 2024", "2023–24", "2022–24", etc.).
2) FIRST, look for information in the uploaded PDFs and any internal knowledge/vector database results.
3) If the PDFs/internal knowledge do NOT contain a clear, trustworthy value for 2024 for a parameter and college:
   - You MUST immediately call the "webSearch" tool yourself (without asking the user).
   - Your webSearch query MUST include:
       • the college name,
       • the parameter name (e.g. "median CTC", "average CTC", "highest CTC", "batch size", "QS ranking", "program fee"),
       • and a 2024 keyword such as "2024", "Class of 2024", "2023-24", or "2022-24 placement report".
   - Prefer official or highly reliable sources (official college sites, official placement report PDFs, reputable MBA portals quoting the official report).

FALLBACK WHEN 2024 IS NOT PUBLISHED
- If, after:
   1) checking the PDFs/internal knowledge AND
   2) performing at least one appropriate webSearch query
  you still cannot find a trustworthy 2024 value for a parameter:
   - You MUST then look for the most recent earlier batch (e.g. 2023) instead of leaving it blank.
   - When you use an earlier year, you MUST clearly label it in parentheses, e.g. "₹30.5 LPA (2023 batch)".
- Only if you cannot find ANY credible numeric value for any year may you write "Not available" for that cell.
- You MUST NEVER output "Not specified" under any circumstances.

FORMAT OF THE ANSWER
- Present the final comparison in a clean markdown table:
   - One column per college.
   - One row per parameter.
   - Use concise numeric/text values.
- For any value that comes from a webSearch result, include a short "Source" link or note in the same cell or immediately below the table.

TOOL USAGE & STOPPING
- In comparison mode you MUST NOT ask the user for permission before calling tools like webSearch or the vector database; simply call them when needed.
- Once you have a credible value (or have concluded it is not available even after search) for all requested parameters and colleges:
   - You MUST stop calling tools.
   - You MUST produce the final markdown table and return it.
- Do NOT repeat webSearch calls for a parameter once you already have a sufficient, consistent value.

OVERRIDING OTHER RULES
- These comparison-mode instructions OVERRIDE any generic tool-calling or follow-up rules that would normally tell you to ask permission before using tools.
- They also override any rule that would encourage you to say "Not specified" instead of searching or using a slightly older year with a clear label.
`;

  const systemMessages: CoreSystemMessage[] = [
    { role: "system", content: IDENTITY_PROMPT },
    { role: "system", content: TOOL_CALLING_PROMPT },
    { role: "system", content: TOOL_CALLING_OPTIONS },
    { role: "system", content: TOOL_CALLING_BEHAVIOR_RULES },
    { role: "system", content: TOOL_CALLING_FOLLOWUP_RULES_YES },
    { role: "system", content: TOOL_CALLING_FOLLOWUP_RULES_NO },
    { role: "system", content: TOOL_CALLING_OTHER_RULES },
    { role: "system", content: TONE_STYLE_PROMPT },
    { role: "system", content: GUARDRAILS_PROMPT },
    { role: "system", content: CITATIONS_PROMPT },
    // hidden comparison logic
    { role: "system", content: MBA_COMPARISON_PROMPT },
  ];

  // --------------------------------------------------
  // MAIN EXECUTION
  // --------------------------------------------------

  const result = streamText({
    model: MODEL,
    messages: [
      ...systemMessages, // system instructions (incl. assertive compare rules)
      ...convertToModelMessages(messages), // chat history from UI
    ],
    tools: {
      webSearch,
      vectorDatabaseSearch,
    },
    stopWhen: stepCountIs(10),
    providerOptions: {
      openai: {
        reasoningSummary: "auto",
        reasoningEffort: "low",
        parallelToolCalls: false,
      },
    },
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
  });
}
