import { Button } from "@/components/ui/button";
import { useThreads } from "@/providers/Thread";
import { Thread } from "@langchain/langgraph-sdk";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

import { getContentString } from "../utils";
import { useQueryState, parseAsBoolean } from "nuqs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { PanelRightOpen, PanelRightClose } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

function ThreadList({
  threads,
  onThreadClick,
}: {
  threads: Thread[];
  onThreadClick?: (threadId: string) => void;
}) {
  const [threadId, setThreadId] = useQueryState("threadId");

  return (
    <div className="flex h-full w-full flex-col items-start justify-start gap-1 overflow-y-scroll [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent px-2 pb-4">
      {threads.map((t) => {
        let itemText = t.thread_id;
        const isActive = t.thread_id === threadId;

        if (
          typeof t.values === "object" &&
          t.values &&
          "messages" in t.values &&
          Array.isArray(t.values.messages) &&
          t.values.messages?.length > 0
        ) {
          const firstMessage = t.values.messages[0];
          itemText = getContentString(firstMessage.content);
        }

        return (
          <div
            key={t.thread_id}
            className="w-full"
          >
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full items-start justify-start text-left font-medium rounded-xl h-auto py-3 px-4 transition-all duration-200 group relative overflow-hidden",
                isActive ? "bg-primary/5 text-primary border border-primary/10 shadow-sm" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
              onClick={(e) => {
                e.preventDefault();
                onThreadClick?.(t.thread_id);
                if (isActive) return;
                setThreadId(t.thread_id);
              }}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
              )}
              <p className="truncate text-ellipsis w-full text-sm leading-tight">{itemText || "Unnamed Thread"}</p>
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function ThreadHistoryLoading() {
  return (
    <div className="flex h-full w-full flex-col items-start justify-start gap-3 px-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton
          key={`skeleton-${i}`}
          className="h-12 w-full rounded-xl opacity-50"
        />
      ))}
    </div>
  );
}

export default function ThreadHistory() {
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  const [chatHistoryOpen, setChatHistoryOpen] = useQueryState(
    "chatHistoryOpen",
    parseAsBoolean.withDefault(false),
  );

  const { getThreads, threads, setThreads, threadsLoading, setThreadsLoading } =
    useThreads();

  useEffect(() => {
    if (typeof window === "undefined") return;
    setThreadsLoading(true);
    getThreads()
      .then(setThreads)
      .catch(console.error)
      .finally(() => setThreadsLoading(false));
  }, []);

  return (
    <>
      <div className="glass h-screen w-[300px] shrink-0 flex-col rotate-0 items-start justify-start gap-4 border-r flex overflow-hidden">
        <div className="flex w-full items-center justify-between px-4 py-6 border-b bg-background/50 backdrop-blur-sm">
          <h1 className="text-xl font-bold tracking-tighter text-gradient leading-none">
            History
          </h1>
          <Button
            className="hover:bg-accent group h-9 w-9 p-0 rounded-lg"
            variant="ghost"
            onClick={() => setChatHistoryOpen((p) => !p)}
          >
            {chatHistoryOpen ? (
              <PanelRightOpen className="size-5 transition-transform group-hover:scale-110" />
            ) : (
              <PanelRightClose className="size-5 transition-transform group-hover:scale-110" />
            )}
          </Button>
        </div>
        <div className="flex-1 w-full overflow-hidden flex flex-col pt-2">
          {threadsLoading ? (
            <ThreadHistoryLoading />
          ) : (
            <ThreadList threads={threads} />
          )}
        </div>
        <div className="p-4 w-full border-t glass mt-auto bg-background/30">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground opacity-40 text-center">
            B2B Lead Gen Assistant
          </p>
        </div>
      </div>
      <div className="lg:hidden">
        <Sheet
          open={!!chatHistoryOpen && !isLargeScreen}
          onOpenChange={(open) => {
            if (isLargeScreen) return;
            setChatHistoryOpen(open);
          }}
        >
          <SheetContent
            side="left"
            className="flex lg:hidden"
          >
            <SheetHeader>
              <SheetTitle>Thread History</SheetTitle>
            </SheetHeader>
            <ThreadList
              threads={threads}
              onThreadClick={() => setChatHistoryOpen((o) => !o)}
            />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
