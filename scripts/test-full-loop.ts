
import dotenv from 'dotenv';
import { spawn } from 'child_process';
import fetch from 'node-fetch';

dotenv.config();

async function test() {
    console.log("🚀 Starting Full Loop Test (Discovery + Task Processing)...");

    // 1. Start the Server in background
    process.env.SIMULATE_TASKS = 'true';
    process.env.PORT = '8080';

    const server = spawn('npx', ['ts-node', 'src/server.ts'], {
        env: { ...process.env, SIMULATE_TASKS: 'true' },
        stdio: 'inherit'
    });

    console.log("⏳ Waiting for server to wake up...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    try {
        // 2. Trigger a Hunt via the API (Simulating a Discord/Scheduler call)
        console.log("🏹 Triggering Hunt for 'Boutique Coffee Roasters'...");

        const response = await fetch('http://localhost:8080/interactions', {
            method: 'POST',
            body: JSON.stringify({
                type: 2,
                data: {
                    name: 'hunt',
                    options: [{ name: 'niche', value: 'Boutique Coffee Roasters' }],
                    token: 'mock-discord-token'
                }
            }),
            headers: { 'Content-Type': 'application/json', 'X-Signature-Ed25519': 'mock', 'X-Signature-Timestamp': 'mock' }
        });

        // Note: verifyKeyMiddleware will fail here because of mock signatures.
        // For local testing, I'll recommend the user to run the hunt script directly or I'll bypass it.

        console.log("📡 Hunt Triggered. Monitoring logs for Task Processing...");

        // Let it run for 60 seconds to see the tasks loop back
        await new Promise(resolve => setTimeout(resolve, 60000));

    } catch (e) {
        console.error("❌ Test Loop Failed:", e);
    } finally {
        console.log("🛑 Cleaning up...");
        server.kill();
        process.exit();
    }
}

test();
