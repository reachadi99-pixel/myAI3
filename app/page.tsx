"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useChat } from "@ai-sdk/react";
import { 
  ArrowUp, 
  Loader2, 
  Plus, 
  Square, 
  GraduationCap, 
  TrendingUp, 
  Building2, 
  Users,
  Sparkles,
  MessageCircle,
  BarChart3,
  Target
} from "lucide-react";
import { MessageWall } from "@/components/messages/message-wall";
import { UIMessage } from "ai";
import { useEffect, useState, useRef } from "react";
import {
  AI_NAME,
  CLEAR_CHAT_TEXT,
  OWNER_NAME,
  WELCOME_MESSAGE,
} from "@/config";
import Image from "next/image";
import Link from "next/link";

const formSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty.")
    .max(2000, "Message must be at most 2000 characters."),
});

const STORAGE_KEY = "chat-messages";

type StorageData = {
  messages: UIMessage[];
  durations: Record<string, number>;
};

const loadMessagesFromStorage = (): {
  messages: UIMessage[];
  durations: Record<string, number>;
} => {
  if (typeof window === "undefined") return { messages: [], durations: {} };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { messages: [], durations: {} };

    const parsed = JSON.parse(stored);
    return {
      messages: parsed.messages || [],
      durations: parsed.durations || {},
    };
  } catch (error) {
    console.error("Failed to load messages from localStorage:", error);
    return { messages: [], durations: {} };
  }
};

const saveMessagesToStorage = (
  messages: UIMessage[],
  durations: Record<string, number>
) => {
  if (typeof window === "undefined") return;
  try {
    const data: StorageData = { messages, durations };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save messages to localStorage:", error);
  }
};

function parseCompareColleges(text: string): {
  collegeA?: string;
  collegeB?: string;
} {
  const match = text.match(/compare\s+(.+?)\s+(?:vs|versus|and)\s+(.+)/i);
  if (!match) return {};
  return {
    collegeA: match[1].trim(),
    collegeB: match[2].trim(),
  };
}

const QUICK_PROMPTS = [
  {
    icon: Building2,
    title: "Compare Colleges",
    description: "IIM vs ISB vs Top B-Schools",
    prompt: "Compare IIM Ahmedabad and IIM Bangalore for MBA placements and ROI"
  },
  {
    icon: TrendingUp,
    title: "Placement Insights",
    description: "Salary trends & recruiters",
    prompt: "What are the latest placement statistics and top recruiters at IIM Calcutta?"
  },
  {
    icon: Target,
    title: "Admission Strategy",
    description: "Cutoffs & selection criteria",
    prompt: "What CAT percentile and profile is needed for IIM Lucknow admission?"
  },
  {
    icon: BarChart3,
    title: "ROI Analysis",
    description: "Fees vs career outcomes",
    prompt: "Which MBA program offers the best ROI considering fees and average salary?"
  }
];

export default function Chat() {
  const [isClient, setIsClient] = useState(false);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [showWelcome, setShowWelcome] = useState(true);

  const stored =
    typeof window !== "undefined"
      ? loadMessagesFromStorage()
      : { messages: [], durations: {} };
  const [initialMessages] = useState<UIMessage[]>(stored.messages);

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    messages: initialMessages,
  });

  const [dotCount, setDotCount] = useState(0);

  useEffect(() => {
    setIsClient(true);
    setDurations(stored.durations);
    setMessages(stored.messages);
    if (stored.messages.length > 0) {
      setShowWelcome(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isClient) {
      saveMessagesToStorage(messages, durations);
    }
  }, [durations, messages, isClient]);

  useEffect(() => {
    if (messages.length > 0) {
      setShowWelcome(false);
    }
  }, [messages.length]);

  useEffect(() => {
    if (status === "submitted" || status === "streaming") {
      const interval = setInterval(() => {
        setDotCount((prev) => (prev + 1) % 4);
      }, 450);
      return () => clearInterval(interval);
    } else {
      setDotCount(0);
    }
  }, [status]);

  const handleDurationChange = (key: string, duration: number) => {
    setDurations((prevDurations) => {
      const newDurations = { ...prevDurations };
      newDurations[key] = duration;
      return newDurations;
    });
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  });

  function onSubmit(data: z.infer<typeof formSchema>) {
    const text = data.message;
    const lower = text.toLowerCase();

    const isCompareIntent = lower.includes("compare");

    if (isCompareIntent) {
      const parsed = parseCompareColleges(text);

      const userMsg: UIMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        parts: [{ type: "text", text }],
      };

      const compareUiMsg: UIMessage = {
        id: `compare-ui-${Date.now()}`,
        role: "assistant",
        parts: [
          {
            type: "data-compare-ui",
            data: {
              defaults: parsed,
            },
          } as any,
        ],
      };

      setMessages((prev) => [...prev, userMsg, compareUiMsg]);
      form.reset();
      return;
    }

    sendMessage({ text });
    form.reset();
  }

  function handleQuickPrompt(prompt: string) {
    setShowWelcome(false);
    sendMessage({ text: prompt });
  }

  function clearChat() {
    const newMessages: UIMessage[] = [];
    const newDurations: Record<string, number> = {};
    setMessages(newMessages);
    setDurations(newDurations);
    saveMessagesToStorage(newMessages, newDurations);
    setShowWelcome(true);
    toast.success("Chat cleared");
  }

  const visibleMessages = messages.filter((m) => {
    if (m.role === "system") return false;
    if (m.role === "user") return true;

    const hasDisplayablePart = m.parts.some((part: any) => {
      return (
        part.type === "text" ||
        part.type === "data-compare-ui"
      );
    });

    return hasDisplayablePart;
  });

  return (
    <div className="flex min-h-screen flex-col font-sans bg-background">
      {/* Professional Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-4xl mx-auto items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-bg shadow-sm">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-foreground tracking-tight">{AI_NAME}</span>
              <span className="text-xs text-muted-foreground">MBA Intelligence Assistant</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!showWelcome && (
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer gap-2 rounded-lg"
                onClick={clearChat}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{CLEAR_CHAT_TEXT} Chat</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container max-w-4xl mx-auto px-4">
        {showWelcome && isClient ? (
          /* Welcome Hero Section */
          <div className="flex flex-col items-center justify-center py-12 min-h-[calc(100vh-16rem)]">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                India's First MBA Intelligence Assistant
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
                Your Personal MBA Counsellor
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Get data-driven insights on B-schools, placements, fees, and career outcomes. 
                Make informed decisions with verified information, not rumors.
              </p>
            </div>

            {/* Quick Prompts Grid */}
            <div className="w-full max-w-2xl mb-8">
              <p className="text-sm font-medium text-muted-foreground mb-4 text-center">
                Start with a common question
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {QUICK_PROMPTS.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickPrompt(item.prompt)}
                    className="prompt-card text-left group"
                    disabled={status === "streaming"}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{item.title}</span>
                        <span className="text-sm text-muted-foreground">{item.description}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span>Verified Data Sources</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                <span>Real-time Web Search</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                <span>Official Placement Reports</span>
              </div>
            </div>
          </div>
        ) : (
          /* Chat Messages Area */
          <div className="py-6 pb-32">
            {isClient ? (
              <>
                <MessageWall
                  messages={visibleMessages}
                  status={status}
                  durations={durations}
                  onDurationChange={handleDurationChange}
                  onSend={(content) => sendMessage({ text: content })}
                />

                {(status === "submitted" || status === "streaming") && (
                  <div className="flex items-center gap-3 py-4 px-4 rounded-xl bg-muted/50 max-w-2xl mt-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg gradient-bg">
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {`Analyzing your query${".".repeat(dotCount)}`}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Fixed Input Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <form id="chat-form" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Controller
                name="message"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel
                      htmlFor="chat-form-message"
                      className="sr-only"
                    >
                      Message
                    </FieldLabel>
                    <div className="relative">
                      <Input
                        {...field}
                        id="chat-form-message"
                        className="h-14 pr-14 pl-5 bg-card rounded-2xl border-border shadow-sm text-base"
                        placeholder="Ask about MBA colleges, placements, fees, cutoffs..."
                        disabled={status === "streaming"}
                        aria-invalid={fieldState.invalid}
                        autoComplete="off"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            form.handleSubmit(onSubmit)();
                          }
                        }}
                      />
                      {(status === "ready" || status === "error") && (
                        <Button
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl h-10 w-10 gradient-bg hover:opacity-90 shadow-sm"
                          type="submit"
                          disabled={!field.value.trim()}
                          size="icon"
                        >
                          <ArrowUp className="h-5 w-5" />
                        </Button>
                      )}
                      {(status === "streaming" || status === "submitted") && (
                        <Button
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl h-10 w-10"
                          size="icon"
                          variant="outline"
                          onClick={() => {
                            stop();
                          }}
                        >
                          <Square className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </Field>
                )}
              />
            </FieldGroup>
          </form>
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
            <span>&copy; 2025 {OWNER_NAME}</span>
            <span className="text-border">|</span>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms of Use
            </Link>
            <span className="text-border">|</span>
            <span>
              Powered by{" "}
              <Link href="https://ringel.ai/" className="hover:text-foreground transition-colors">
                Ringel.AI
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
