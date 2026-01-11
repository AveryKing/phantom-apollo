
import { CloudTasksClient } from '@google-cloud/tasks';
import dotenv from 'dotenv';

dotenv.config();

const client = new CloudTasksClient();

const projectId = process.env.GOOGLE_CLOUD_PROJECT;
const location = process.env.GOOGLE_LOCATION || 'us-central1';
const queue = 'lead-processing-queue';
const serviceUrl = process.env.SERVICE_URL; // Public URL of the Cloud Run service

/**
 * Dispatch a lead for processing via Google Cloud Tasks
 * This allows for rate-limited, async processing of vision/outreach steps.
 */
export async function dispatchLeadTask(leadId: string, discordToken?: string) {
    if (!projectId || !serviceUrl) {
        console.warn('⚠️ Cloud Tasks dispatch skipped: GOOGLE_CLOUD_PROJECT or SERVICE_URL missing.');
        return;
    }

    const parent = client.queuePath(projectId, location, queue);

    const payload = {
        leadId,
        discordToken
    };

    const task = {
        httpRequest: {
            httpMethod: 'POST' as const,
            url: `${serviceUrl}/process-lead`,
            body: Buffer.from(JSON.stringify(payload)).toString('base64'),
            headers: {
                'Content-Type': 'application/json',
            },
            // Note: In production, we should add OIDC token for internal Cloud Run security
            // oidcToken: { serviceAccountEmail: '...' }
        },
    };

    console.log(`📡 [CloudTasks] Dispatching lead ${leadId} to ${task.httpRequest.url}`);

    try {
        const [response] = await client.createTask({ parent, task });
        console.log(`✅ [CloudTasks] Task created: ${response.name}`);
        return response;
    } catch (error) {
        console.error(`❌ [CloudTasks] Failed to create task for lead ${leadId}:`, error);
        throw error;
    }
}
