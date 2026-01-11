import { StateGraph, END, START, MemorySaver } from "@langchain/langgraph";
import { ChatVertexAI } from "@langchain/google-vertexai";
import { RunnableConfig } from "@langchain/core/runnables";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { graph as beastGraph } from "./graph";
import { withLangfuseTracing, flushLangfuse } from "./lib/tracing";
import dotenv from "dotenv";

dotenv.config();

/**
 * Chat Assistant State
 */
interface AssistantState {
  messages: BaseMessage[];
  niche?: string;
}

/**
 * Helper to normalize message content to string.
 */
function normalizeContent(content: any): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map(c => {
      if (typeof c === 'string') return c;
      if (c?.text) return c.text;
      return '';
    }).join(' ');
  }
  return String(content?.text || content || '');
}

/**
 * Extract hunt command
 */
function extractHuntCommand(messages: BaseMessage[]): { isHunt: boolean; niche?: string } {
  if (messages.length === 0) return { isHunt: false };

  const lastMessage = messages[messages.length - 1];
  const content = normalizeContent(lastMessage.content).trim();

  // Regex Patterns
  const patterns = [
    /^(?:start\s+)?(?:prospecting\s+)?hunt\s+for\s+(.+)/i,
    /^prospect\s+for\s+(.+)/i,
    /^hunt\s+(.+)/i
  ];

  for (const p of patterns) {
    const match = content.match(p);
    if (match && match[1]) {
      return { isHunt: true, niche: match[1].trim() };
    }
  }

  // Generic keyword check
  if (/^hunt$/i.test(content) || /^start hunt$/i.test(content)) {
    return { isHunt: true, niche: "Enterprise B2B SaaS for Logistics" };
  }

  return { isHunt: false };
}

/**
 * Detect approval/continuation commands
 */
function isContinuationMessage(messages: BaseMessage[]): boolean {
  if (messages.length === 0) return false;
  const content = normalizeContent(messages[messages.length - 1].content).toLowerCase().trim();
  const patterns = [
    /^yes$/i, /^approve$/i, /^proceed$/i, /^go ahead$/i, /^yep$/i, /^ok$/i, /^okay$/i,
    /proceed with prospecting/i, /looks good/i, /start prospecting/i
  ];
  return patterns.some(p => p.test(content));
}

/**
 * Prepare Hunt Node
 * Extracts the niche and signals the start of the beast mode subgraph.
 */
async function prepareHuntNode(state: AssistantState, config?: RunnableConfig): Promise<Partial<AssistantState>> {
  try {
    const { niche } = extractHuntCommand(state.messages);
    const nicheToUse = niche || "Enterprise B2B SaaS for Logistics";

    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`🎯 [HUNT] Initiating search for: ${nicheToUse}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Add tracing metadata for the hunt
    const tracedConfig = withLangfuseTracing(config, "prepare-hunt", {
      niche: nicheToUse,
      hunt_initiated: true,
    });

    // We return the niche so the Child Graph (BeastMode) can read it from the state
    return {
      niche: nicheToUse,
      messages: [new AIMessage(`🚀 **Hunt Initiated!**\n\nStarting comprehensive research and prospecting for **${nicheToUse}**.\n\nPlease wait while I analyze the market and find leads...`)]
    };
  } catch (error) {
    console.error("❌ [ERROR] Failed to prepare hunt:", error);
    return {
      messages: [new AIMessage("Sorry, I encountered an error while preparing the hunt. Please try again.")]
    };
  }
}

/**
 * Simple chat assistant using Vertex AI Gemini
 */
async function chatNode(state: AssistantState, config?: RunnableConfig): Promise<Partial<AssistantState>> {
  try {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];
    const userInput = normalizeContent(lastMessage.content);

    console.log("");
    console.log("💬 [CHAT] User Message:", userInput);

    // Initialize model
    const model = new ChatVertexAI({
      model: "gemini-2.0-flash-exp",
      temperature: 0.7,
      maxOutputTokens: 2048,
    });

    // Add Langfuse tracing to the config
    const tracedConfig = withLangfuseTracing(config, "assistant-chat", {
      user_input: userInput.substring(0, 100), // First 100 chars
    });

    console.log("💭 [THOUGHT] Thinking of a response...");
    const response = await model.invoke([
      new SystemMessage("You are a business assistant. If user says 'hunt', I will handle it. Otherwise, answer helpfully."),
      ...messages
    ], tracedConfig);

    console.log("🤖 [RESPONSE]:", normalizeContent(response.content));
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    return { messages: [response] };
  } catch (error) {
    console.error("❌ [ERROR] Chat node failed:", error);
    return {
      messages: [new AIMessage("I apologize, but I encountered an error processing your message. Please try again.")]
    };
  }
}

/**
 * Create the assistant graph
 */
function createAssistantGraph() {
  const workflow = new StateGraph<AssistantState>({
    channels: {
      messages: {
        reducer: (x: BaseMessage[], y: BaseMessage[]) => {
          const combined = [...(x || []), ...(y || [])];
          const seen = new Set();
          return combined.filter(m => {
            const id = m.id;
            if (!id) return true;
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          });
        },
        default: () => [],
      },
      niche: {
        reducer: (x: string | undefined, y: string | undefined) => y || x, // Overwrite
        default: () => undefined
      }
    } as any,
  })
    .addNode("prepare_hunt", prepareHuntNode)
    .addNode("chat", chatNode)
    .addNode("beast_mode", beastGraph) // Mount the Subgraph!

    .addConditionalEdges(START, (state: AssistantState) => {
      const { isHunt } = extractHuntCommand(state.messages);
      if (isHunt) return "prepare_hunt";

      if (state.niche && isContinuationMessage(state.messages)) {
        return "beast_mode";
      }

      return "chat";
    })
    .addEdge("prepare_hunt", "beast_mode")
    .addEdge("beast_mode", END)
    .addEdge("chat", END);

  return workflow.compile({
    checkpointer: new MemorySaver()
  });
}

export const graph = createAssistantGraph();
export { extractHuntCommand };
