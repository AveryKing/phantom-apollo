#!/usr/bin/env node

import dotenv from "dotenv";
dotenv.config();

const BASE_URL = "http://localhost:2024";
const threadId = process.argv[2];
const approval = process.argv[3] || "approved";

if (!threadId) {
    console.error("Usage: npx tsx scripts/approve-interrupt.ts <thread_id> [approval_value]");
    process.exit(1);
}

async function approveInterrupt() {
    console.log(`📡 Approving interrupt for thread ${threadId}...`);

    try {
        // First, get the current state to find the interrupt
        const stateResponse = await fetch(`${BASE_URL}/threads/${threadId}/state`);
        const state = await stateResponse.json();

        console.log(`Found ${state.tasks?.length || 0} tasks`);

        // Find the task with an interrupt
        const interruptTask = state.tasks?.find((t: any) => t.interrupts && t.interrupts.length > 0);

        if (!interruptTask) {
            console.error("❌ No interrupt found in this thread");
            process.exit(1);
        }

        console.log(`Found interrupt: ${JSON.stringify(interruptTask.interrupts[0].value)}`);

        // Resume by providing the interrupt value
        const response = await fetch(`${BASE_URL}/threads/${threadId}/runs/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                assistant_id: "agent",
                command: {
                    resume: approval  // Provide the approval value
                }
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Failed to approve interrupt: ${err}`);
        }

        console.log("✅ Interrupt approved! Graph will continue...");

        // Stream the response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                process.stdout.write(chunk);
            }
        }

    } catch (error) {
        console.error("❌ Error approving interrupt:", error);
        process.exit(1);
    }
}

approveInterrupt();
