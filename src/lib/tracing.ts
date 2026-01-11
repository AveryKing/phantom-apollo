import { Langfuse } from "langfuse";
import { CallbackHandler as LangfuseCallbackHandler } from "langfuse-langchain";
import { RunnableConfig } from "@langchain/core/runnables";

/**
 * Initialize Langfuse client
 */
export const langfuse = new Langfuse({
    publicKey: process.env.LANGFUSE_PUBLIC_KEY || "",
    secretKey: process.env.LANGFUSE_SECRET_KEY || "",
    baseUrl: process.env.LANGFUSE_HOST || "https://us.cloud.langfuse.com",
});

if (!process.env.LANGFUSE_PUBLIC_KEY) {
    console.warn("⚠️ [Langfuse] Keys missing. Tracing will be disabled.");
}

/**
 * Create a Langfuse callback handler for LangGraph tracing
 */
export function createLangfuseHandler(options?: {
    sessionId?: string;
    userId?: string;
    metadata?: Record<string, any>;
    tags?: string[];
}): LangfuseCallbackHandler {
    return new LangfuseCallbackHandler({
        publicKey: process.env.LANGFUSE_PUBLIC_KEY || "",
        secretKey: process.env.LANGFUSE_SECRET_KEY || "",
        baseUrl: process.env.LANGFUSE_HOST || "https://us.cloud.langfuse.com",
        sessionId: options?.sessionId,
        userId: options?.userId,
        metadata: options?.metadata,
        tags: options?.tags,
    });
}

/**
 * Add Langfuse tracing to a RunnableConfig
 */
export function withLangfuseTracing(
    config: RunnableConfig | undefined,
    traceName: string,
    metadata?: Record<string, any>
): RunnableConfig {
    const handler = createLangfuseHandler({
        metadata: { traceName, ...metadata },
        tags: [traceName],
    });

    const existingCallbacks = config?.callbacks || [];
    const callbacksArray = Array.isArray(existingCallbacks)
        ? existingCallbacks
        : [existingCallbacks];

    return {
        ...config,
        callbacks: [...callbacksArray, handler],
        metadata: {
            ...config?.metadata,
            langfuse_trace_name: traceName,
            ...metadata,
        },
    };
}

/**
 * Log a thought/status message to Langfuse
 */
export function logThought(
    handler: LangfuseCallbackHandler,
    thought: string,
    metadata?: Record<string, any>
) {
    // The handler will automatically capture this through LangChain's callback system
    // when AIMessages are emitted from nodes
    console.log(`💭 [Thought] ${thought}`);
}

/**
 * Flush Langfuse traces (call at end of execution)
 */
export async function flushLangfuse() {
    try {
        await langfuse.flushAsync();
        console.log("✅ [Langfuse] Traces flushed successfully");
    } catch (error) {
        console.error("⚠️ [Langfuse] Failed to flush traces:", error);
        // Don't throw - we don't want Langfuse errors to break the flow
    }
}
