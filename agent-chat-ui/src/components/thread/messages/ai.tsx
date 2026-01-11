import { parsePartialJson } from "@langchain/core/output_parsers";
import { useStreamContext } from "@/providers/Stream";
import { AIMessage, Checkpoint, Message } from "@langchain/langgraph-sdk";
import { getContentString } from "../utils";
import { BranchSwitcher, CommandBar } from "./shared";
import { MarkdownText } from "../markdown-text";
import { LoadExternalComponent } from "@langchain/langgraph-sdk/react-ui";
import { cn } from "@/lib/utils";
import { ToolCalls, ToolResult } from "./tool-calls";
import { MessageContentComplex } from "@langchain/core/messages";
import { Fragment } from "react/jsx-runtime";
import { isAgentInboxInterruptSchema } from "@/lib/agent-inbox-interrupt";
import { ThreadView } from "../agent-inbox";
import { useQueryState, parseAsBoolean } from "nuqs";
import { GenericInterruptView } from "./generic-interrupt";
import { useArtifact } from "../artifact";

// Helper to detect if a message is a short status update (e.g. from backend logs)
function isStatusMessage(content: string) {
  const statusPrefixes = ['🔍', '📊', '🎯', "✅", "🚀", "📡"];
  const isShort = content.length < 500;
  return statusPrefixes.some(p => content.trim().startsWith(p)) && isShort;
}

// Modern Status Widget (Glassmorphism + Animation)
function StatusWidget({ content }: { content: string }) {
  // Safe extraction of emoji 
  const match = content.match(/^([\p{Emoji}\u203C-\u3299])\s*(.*)/u);
  const emoji = match ? match[1] : "⚡";
  // Remove emoji from start for text
  const text = content.replace(/^[\p{Emoji}\u203C-\u3299]\s*/u, "");

  return (
    <div className="group flex w-fit max-w-[85%] items-center gap-4 rounded-xl bg-sidebar/50 px-5 py-3 text-sm font-medium shadow-sm ring-1 ring-white/10 backdrop-blur-md transition-all hover:bg-sidebar/80 hover:ring-primary/20 animate-in fade-in slide-in-from-left-4 duration-500 my-1">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg text-primary shadow-[0_0_15px_-3px_var(--primary)] ring-1 ring-primary/20">
        {emoji}
      </div>
      <div className="flex-1">
        <div className="prose-sm dark:prose-invert leading-snug text-foreground/90 font-medium">
          <MarkdownText>{text}</MarkdownText>
        </div>
      </div>
      {content.includes("...") && (
        <div className="flex gap-1 ml-2 self-center">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 delay-0"></span>
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 delay-150"></span>
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 delay-300"></span>
        </div>
      )}
    </div>
  );
}

function CustomComponent({
  message,
  thread,
}: {
  message: Message;
  thread: ReturnType<typeof useStreamContext>;
}) {
  const artifact = useArtifact();
  const { values } = useStreamContext();
  const customComponents = values.ui?.filter(
    (ui) => ui.metadata?.message_id === message.id,
  );

  if (!customComponents?.length) return null;
  return (
    <Fragment key={message.id}>
      {customComponents.map((customComponent) => (
        <LoadExternalComponent
          key={customComponent.id}
          stream={thread}
          message={customComponent}
          meta={{ ui: customComponent, artifact }}
        />
      ))}
    </Fragment>
  );
}

function parseAnthropicStreamedToolCalls(
  content: MessageContentComplex[],
): AIMessage["tool_calls"] {
  const toolCallContents = content.filter((c) => c.type === "tool_use" && c.id);

  return toolCallContents.map((tc) => {
    const toolCall = tc as Record<string, any>;
    let json: Record<string, any> = {};
    if (toolCall?.input) {
      try {
        json = parsePartialJson(toolCall.input) ?? {};
      } catch {
        // Pass
      }
    }
    return {
      name: toolCall.name ?? "",
      id: toolCall.id ?? "",
      args: json,
      type: "tool_call",
    };
  });
}

interface InterruptProps {
  interrupt?: unknown;
  isLastMessage: boolean;
  hasNoAIOrToolMessages: boolean;
}

function Interrupt({
  interrupt,
  isLastMessage,
  hasNoAIOrToolMessages,
}: InterruptProps) {
  const fallbackValue = Array.isArray(interrupt)
    ? (interrupt as Record<string, any>[])
    : (((interrupt as { value?: unknown } | undefined)?.value ??
      interrupt) as Record<string, any>);

  return (
    <>
      {isAgentInboxInterruptSchema(interrupt) &&
        (isLastMessage || hasNoAIOrToolMessages) && (
          <ThreadView interrupt={interrupt} />
        )}
      {interrupt &&
        !isAgentInboxInterruptSchema(interrupt) &&
        (isLastMessage || hasNoAIOrToolMessages) ? (
        <GenericInterruptView interrupt={fallbackValue} />
      ) : null}
    </>
  );
}

export function AssistantMessage({
  message,
  isLoading,
  handleRegenerate,
}: {
  message: Message | undefined;
  isLoading: boolean;
  handleRegenerate: (parentCheckpoint: Checkpoint | null | undefined) => void;
}) {
  const content = message?.content ?? [];
  const contentString = getContentString(content);
  const [hideToolCalls] = useQueryState(
    "hideToolCalls",
    parseAsBoolean.withDefault(false),
  );

  const thread = useStreamContext();
  const isLastMessage =
    thread.messages[thread.messages.length - 1].id === message?.id;
  const hasNoAIOrToolMessages = !thread.messages.find(
    (m) => m.type === "ai" || m.type === "tool",
  );
  const threadInterrupt = thread.interrupt;
  const anthropicStreamedToolCalls = Array.isArray(content)
    ? parseAnthropicStreamedToolCalls(content)
    : undefined;

  const hasToolCalls =
    message &&
    "tool_calls" in message &&
    message.tool_calls &&
    message.tool_calls.length > 0;
  const toolCallsHaveContents =
    hasToolCalls &&
    message.tool_calls?.some(
      (tc) => tc.args && Object.keys(tc.args).length > 0,
    );
  const hasAnthropicToolCalls = !!anthropicStreamedToolCalls?.length;
  const isToolResult = message?.type === "tool";

  if (isToolResult && hideToolCalls) {
    return null;
  }

  return (
    <div className="group mr-auto flex w-full items-start gap-2">
      <div className="flex w-full flex-col gap-2">
        {isToolResult ? (
          <>
            <ToolResult message={message} />
            <Interrupt
              interrupt={threadInterrupt}
              isLastMessage={isLastMessage}
              hasNoAIOrToolMessages={hasNoAIOrToolMessages}
            />
          </>
        ) : (
          <>
            {/* Logic to Render Status Widget or Standard Markdown */}
            {contentString.length > 0 && isStatusMessage(contentString) ? (
              <StatusWidget content={contentString} />
            ) : (
              <>
                {contentString.length > 0 && (
                  <div className="py-1">
                    <MarkdownText>{contentString}</MarkdownText>
                  </div>
                )}

                {!hideToolCalls && (
                  <>
                    {(hasToolCalls && toolCallsHaveContents && (
                      <ToolCalls toolCalls={message.tool_calls} />
                    )) ||
                      (hasAnthropicToolCalls && (
                        <ToolCalls toolCalls={anthropicStreamedToolCalls} />
                      )) ||
                      (hasToolCalls && (
                        <ToolCalls toolCalls={message.tool_calls} />
                      ))}
                  </>
                )}
              </>
            )}

            {message && (
              <CustomComponent
                message={message}
                thread={thread}
              />
            )}
            <Interrupt
              interrupt={threadInterrupt}
              isLastMessage={isLastMessage}
              hasNoAIOrToolMessages={hasNoAIOrToolMessages}
            />
            <div
              className={cn(
                "mr-auto flex items-center gap-2 transition-opacity",
                "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100",
              )}
            >
              <CommandBar
                content={contentString}
                isLoading={isLoading}
                isAiMessage={true}
                handleRegenerate={() => handleRegenerate(null)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Enhanced Loading State
export function AssistantMessageLoading() {
  return (
    <div className="mr-auto flex items-center gap-4 py-4 px-2 animate-in fade-in duration-700">
      <div className="relative flex h-10 w-10 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/20 duration-1000" />
        <div className="relative h-5 w-5 animate-spin rounded-md bg-gradient-to-tr from-primary to-primary/50 shadow-[0_0_15px_var(--primary)]" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="animate-pulse font-semibold text-primary/80 tracking-wide uppercase text-xs">Thinking</span>
        <div className="h-1 w-24 overflow-hidden rounded-full bg-muted/50">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-primary/70 origin-left" />
        </div>
      </div>
    </div>
  );
}
