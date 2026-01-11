
import express from 'express';
import bodyParser from 'body-parser';
import { verifyKeyMiddleware } from 'discord-interactions';
import dotenv from 'dotenv';
import { strategistNode } from './agents/strategist';
import { visionaryNode } from './agents/visionary';
import { AgentState } from './types';
import { runBeastMode } from './graph';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
// Discord requires raw body for signature verification, but verifyKeyMiddleware handles it if placed correctly.
// For other endpoints, we use JSON body parsing.

// --- 1. Discord Interactions Endpoint ---
// This handles Slash Commands like /prospect
app.post('/interactions',
    verifyKeyMiddleware(process.env.DISCORD_PUBLIC_KEY || 'mock-key'),
    async (req, res) => {
        const { type, data } = req.body;

        // Type 1: Ping (Discord verification)
        if (type === 1) {
            return res.send({ type: 1 });
        }

        // Type 2: Application Command (Slash Command)
        if (type === 2) {
            if (data.name === 'hunt' || data.name === 'prospect') {
                // Return an "Deferred" response immediately so Discord doesn't timeout
                res.send({
                    type: 5, // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
                });

                console.log(`👀 /${data.name} caught! Triggering Beast Mode...`);

                // Trigger the full pipeline asynchronously
                // In a real serverless env, we'd push to Pub/Sub. 
                // Here we run it detached.
                (async () => {
                    try {
                        const result = await runBeastMode("Enterprise B2B SaaS for Logistics"); // Default niche for manual trigger
                        console.log('✅ Async Beast Mode Complete');
                        // TODO: Send follow-up message to Discord with results
                    } catch (err) {
                        console.error('❌ Async Beast Mode Failed:', err);
                    }
                })();

                return;
            }
        }

        return res.status(400).send('Unknown command');
    }
);

// --- 2. Cron Job Endpoint (Cloud Scheduler) ---
// Authenticated via Service Account OIDC token (Cloud Run handles ingress auth if configured,
// but we might want app-level checks too if public).
app.post('/hunt', bodyParser.json(), async (req, res) => {
    console.log('🏹 Daily Hunt execution started');

    // Quick response to scheduler
    res.status(202).send({ status: 'Hunt started' });

    // Execute the Workflow
    try {
        const initialState: AgentState = {
            niche: "TBD",
            status: 'researching',
            queries: [],
            searchResults: [],
            leads: [],
            scores: { overall: 0, marketSize: 0, competition: 0, willingnessToPay: 0 },
            painPoints: [],
            researchNotes: ""
        };

        // 1. Strategist
        const stratResult = await strategistNode(initialState);
        const niche = stratResult.niche;
        console.log(`Phase 1 Complete: Niche chosen is ${niche}`);

        // TODO: Call Scout Node (Missing in current codebase, need to implement tomorrow/Day 4 planning)
        // For now, skip to a mock lead for Visionary test

        // 2. Visionary
        // We need leads to test Visionary. 
        // As we haven't implemented Scout fully yet (it was in the plan but not code), we'll skip for this dry run.
        console.log('Phase 2 [Scout] Skipped (Pending Implementation)');

        console.log('🏹 Daily Hunt Complete (Dry Run)');

    } catch (error) {
        console.error('Hunt Failed:', error);
    }
});

// Health Check
app.get('/', (req, res) => {
    res.send('Phantom Apollo is Online 👻');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
