#!/usr/bin/env node

import dotenv from "dotenv";
dotenv.config();

const BASE_URL = "http://localhost:2024";
const threadId = process.argv[2];

if (!threadId) {
    console.error("Usage: npx tsx scripts/check-thread.ts <thread_id>");
    process.exit(1);
}

async function checkThread() {
    try {
        // Get thread state
        const response = await fetch(`${BASE_URL}/threads/${threadId}/state`);

        if (!response.ok) {
            throw new Error(`Failed to get thread state: ${response.statusText}`);
        }

        const state = await response.json();

        console.log("🧵 Thread State:");
        console.log("================");
        console.log(JSON.stringify(state, null, 2));

        // Extract key info
        if (state.values) {
            console.log("\n📊 Summary:");
            console.log(`  Messages: ${state.values.messages?.length || 0}`);
            console.log(`  Niche: ${state.values.niche || 'Not set'}`);
            console.log(`  Leads: ${state.values.leads?.length || 0}`);
            console.log(`  Pain Points: ${state.values.painPoints?.length || 0}`);

            // Show last message
            if (state.values.messages && state.values.messages.length > 0) {
                const lastMsg = state.values.messages[state.values.messages.length - 1];
                console.log(`\n💬 Last Message (${lastMsg.type}):`);
                console.log(`  ${typeof lastMsg.content === 'string' ? lastMsg.content.substring(0, 200) : JSON.stringify(lastMsg.content).substring(0, 200)}...`);
            }
        }

    } catch (error) {
        console.error("❌ Error checking thread:", error);
        process.exit(1);
    }
}

checkThread();
