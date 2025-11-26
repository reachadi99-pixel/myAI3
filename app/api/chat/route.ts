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
You are an MBA college comparison assistant.

When a user message asks to compare B-schools (for example starts with or contains the word "compare") you MUST treat it as a special "comparison mode" request. In comparison mode, follow ALL of these rules:

1) Always extract the college names and the requested parameters from the user's message.

2) For every requested parameter, FIRST look for information in the uploaded PDFs and any internal knowledge / vector database results.

3) If the PDFs / internal knowledge do NOT contain a clear, up-to-date numeric value for that parameter:
   - You MUST IMMEDIATELY call the "webSearch" tool yourself.
   - You MUST NOT ask the user for permission before calling webSearch.
   - Your webSearch query MUST explicitly include:
       • the college name
       • the parameter (e.g. "median CTC", "average CTC", "highest CTC", "batch size", etc.)
       • the year "2024"
     For example: "SPJIMR Mumbai 2024 median CTC official placement report".
   - You MUST strongly prefer official or highly reliable sources (official college site, official placement report PDFs, government / authoritative rankings).

4) You MUST prefer placement and program data for the 2024 batch by default. If 2024 data truly does not exist, you may fall back to the latest available year (e.g. 2023), but you MUST clearly label the year in parentheses, for example: "₹30 LPA (2023 batch)".

5) You MUST NEVER output "Not specified" under any circumstances.
   - Only output "Not available" AFTER you have:
       • checked the PDFs / internal knowledge
       • AND performed at least one appropriate webSearch for that parameter and college
     and still cannot find a trustworthy value.

6) Present comparison results in a clean markdown table:
   - one column per college
   - one row per parameter
   - clear, concise numeric values wherever possible.

7) For any values that come from webSearch, you MUST include a short "Source" link or note in the same cell or immediately below the table.

8) These comparison-mode instructions OVERRIDE any other tool-calling or follow-up rules, including any instructions that say you should ask the user before using tools. In comparison mode you SHOULD NOT ask for permission before calling tools like webSearch or the vector database; you should simply call them and then return the final answer.
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
    // 👇 hidden comparison logic
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
