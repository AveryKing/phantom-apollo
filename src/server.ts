
import express from 'express';
import bodyParser from 'body-parser';
import { verifyKeyMiddleware } from 'discord-interactions';
import dotenv from 'dotenv';
import { runBeastMode } from './graph';
import { processSingleLead } from './processors/lead-processor';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// --- 1. Discord Interactions Endpoint ---
// Use raw body parser for signature verification - verifyKeyMiddleware needs raw body
app.post('/interactions',
    express.raw({ type: 'application/json' }),
    verifyKeyMiddleware(process.env.DISCORD_PUBLIC_KEY || 'mock-key'),
    async (req, res) => {
        const { type, data } = req.body;

        if (type === 1) return res.send({ type: 1 });

        if (type === 2) {
            if (data.name === 'hunt' || data.name === 'prospect') {
                res.send({ type: 5 }); // DEFERRED

                const options = data.options || [];
                const nicheParam = options.find((o: any) => o.name === 'niche')?.value || "Enterprise B2B SaaS for Logistics";

                console.log(`👀 /${data.name} caught for niche: ${nicheParam}`);

                (async () => {
                    try {
                        await runBeastMode(nicheParam, data.token);
                        console.log('✅ Async Beast Mode Complete');
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

// --- 2. Lead Processing Endpoint (Throttled via Cloud Tasks) ---
app.post('/process-lead', bodyParser.json(), async (req, res) => {
    const { leadId, discordToken } = req.body;

    if (!leadId) {
        return res.status(400).send({ error: 'Missing leadId' });
    }

    console.log(`🤖 Received Task: Processing lead ${leadId}`);

    // Respond immediately to Cloud Tasks
    res.status(202).send({ status: 'Processing started' });

    // Run the heavy lifting
    try {
        await processSingleLead(leadId, discordToken);
    } catch (err) {
        console.error(`❌ Fatal error processing lead ${leadId}:`, err);
    }
});

// --- 3. Cron Job Endpoint (Cloud Scheduler) ---
app.post('/hunt', bodyParser.json(), async (req, res) => {
    console.log('🏹 Daily Hunt execution started');
    res.status(202).send({ status: 'Hunt started' });

    try {
        // Run without a discord token (system hunt)
        await runBeastMode("Solar Installers");
    } catch (error) {
        console.error('Hunt Failed:', error);
    }
});

// Health Check
app.get('/', (req, res) => {
    res.send('Phantom Apollo is Online (Task-Ready) 👻');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
