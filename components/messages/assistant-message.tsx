import { UIMessage } from "ai";
import { Response } from "@/components/ai-elements/response";
import { ReasoningPart } from "./reasoning-part";

type Props = {
  message: UIMessage;
  status?: string;
  isLastMessage?: boolean;
  durations?: Record<string, number>;
  onDurationChange?: (key: string, duration: number) => void;
};

export function AssistantMessage({
  message,
  status,
  isLastMessage,
  durations,
  onDurationChange,
}: Props) {
  return (
    <div className="w-full">
      <div className="text-sm flex flex-col gap-4 bg-card rounded-2xl p-4 border border-border/50 shadow-sm">
        {message.parts.map((part, i) => {
          const isStreaming =
            status === "streaming" &&
            isLastMessage &&
            i === message.parts.length - 1;
          const durationKey = `${message.id}-${i}`;
          const duration = durations?.[durationKey];

          // ✅ Normal assistant text
          if (part.type === "text") {
            return (
              <Response key={`${message.id}-${i}`}>{part.text}</Response>
            );
          }

          // ✅ Optional reasoning display (if you’re using it)
          if (part.type === "reasoning") {
            return (
              <ReasoningPart
                key={`${message.id}-${i}`}
                part={part}
                isStreaming={isStreaming}
                duration={duration}
                onDurationChange={
                  onDurationChange
                    ? (d) => onDurationChange(durationKey, d)
                    : undefined
                }
              />
            );
          }

          // ❌ Tool parts (tool calls / tool results) – DO NOT RENDER ANYTHING
          if (
            part.type.startsWith("tool-") ||
            part.type === "dynamic-tool"
          ) {
            return null;
          }

          // Fallback: ignore anything else
          return null;
        })}
      </div>
    </div>
  );
}
