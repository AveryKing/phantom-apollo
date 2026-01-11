
import dotenv from "dotenv";

dotenv.config();

const BASE_URL = "http://localhost:2024";

async function testChat(message: string) {
    console.log(`📡 Sending message: "${message}" to ${BASE_URL}...`);

    try {
        // 1. Create a thread
        const threadResponse = await fetch(`${BASE_URL}/threads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        const thread = await threadResponse.json() as { thread_id: string };
        console.log(`🧵 Created thread: ${thread.thread_id}`);

        // 2. Start a run (streaming)
        const runResponse = await fetch(`${BASE_URL}/threads/${thread.thread_id}/runs/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                assistant_id: "agent",
                input: {
                    messages: [
                        { role: "user", content: message }
                    ]
                }
            })
        });

        if (!runResponse.ok) {
            const err = await runResponse.text();
            throw new Error(`Failed to start run: ${err}`);
        }

        console.log("📥 Receiving response stream...");
        // For simplicity in a script, we won't fully parse the SSE stream line by line here, 
        // but normally we would. The server logs will show the "Thoughts" anyway.
        console.log("✅ Run initiated. Check the server terminal for 'Thoughts' and 'Responses'.");

    } catch (error) {
        console.error("❌ Error testing chat:", error);
    }
}

const input = process.argv[2] || "Hello, who are you?";
testChat(input);
