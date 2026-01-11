#!/usr/bin/env node

import dotenv from "dotenv";
dotenv.config();

const BASE_URL = "http://localhost:2024";
const threadId = process.argv[2];
const message = process.argv[3] || "yes";

if (!threadId) {
    console.error("Usage: npx tsx scripts/continue-thread.ts <thread_id> [message]");
    process.exit(1);
}

async function continueThread() {
    console.log(`📡 Continuing thread ${threadId} with message: "${message}"`);

    try {
        // Send continuation message
        const runResponse = await fetch(`${BASE_URL}/threads/${threadId}/runs/stream`, {
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
            throw new Error(`Failed to continue thread: ${err}`);
        }

        console.log("✅ Continuation message sent successfully!");
        console.log("📥 Check the server terminal for updates...");

    } catch (error) {
        console.error("❌ Error continuing thread:", error);
        process.exit(1);
    }
}

continueThread();
