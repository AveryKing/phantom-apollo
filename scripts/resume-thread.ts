#!/usr/bin/env node

import dotenv from "dotenv";
dotenv.config();

const BASE_URL = "http://localhost:2024";
const threadId = process.argv[2];

if (!threadId) {
    console.error("Usage: npx tsx scripts/resume-thread.ts <thread_id>");
    process.exit(1);
}

async function resumeThread() {
    console.log(`📡 Resuming thread ${threadId} (approving interrupt)...`);

    try {
        // Resume the thread by updating state with null (approve)
        const response = await fetch(`${BASE_URL}/threads/${threadId}/runs/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                assistant_id: "agent",
                command: {
                    resume: null  // Approve the interrupt
                }
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Failed to resume thread: ${err}`);
        }

        console.log("✅ Thread resumed successfully!");
        console.log("📥 The agent will now continue with prospecting...");

    } catch (error) {
        console.error("❌ Error resuming thread:", error);
        process.exit(1);
    }
}

resumeThread();
