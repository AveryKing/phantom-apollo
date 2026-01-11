
import { graph } from "../src/assistant";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";

async function reproduce() {
    const checkpointer = new MemorySaver();
    // Note: assistant.ts already has a checkpointer, but we use a local one for reproduction if needed
    // Actually, let's just use the exported graph which has its own checkpointer.

    const config = { configurable: { thread_id: "repro-thread" } };

    console.log("--- 1. Starting Hunt ---");
    const r1 = await graph.invoke({
        messages: [new HumanMessage("Hunt for luxury coffee")]
    }, config) as any;

    console.log("Assistant response:", r1.messages[r1.messages.length - 1].content);
    console.log("Next nodes:", (await graph.getState(config)).next);

    console.log("\n--- 2. Sending 'yes' (Expected to approve, but might go to chat) ---");
    const r2 = await graph.invoke({
        messages: [new HumanMessage("yes")]
    }, config) as any;

    console.log("Assistant response:", r2.messages[r2.messages.length - 1].content);
}

reproduce().catch(console.error);
