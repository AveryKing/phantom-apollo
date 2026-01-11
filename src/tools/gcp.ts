
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { Storage } from '@google-cloud/storage';
import dotenv from 'dotenv';

dotenv.config();

const secretClient = new SecretManagerServiceClient();
const storage = new Storage();

const projectId = process.env.GOOGLE_CLOUD_PROJECT;

/**
 * Access a secret from GCP Secret Manager
 */
export async function getSecret(name: string): Promise<string | undefined> {
    if (!projectId) return process.env[name]; // Fallback to env during local dev

    try {
        const [version] = await secretClient.accessSecretVersion({
            name: `projects/${projectId}/secrets/${name}/versions/latest`,
        });

        const payload = version.payload?.data?.toString();
        return payload;
    } catch (error) {
        console.warn(`⚠️ [SecretManager] Failed to fetch secret ${name}:`, error);
        return process.env[name]; // Fallback
    }
}

/**
 * Upload a public screenshot to Google Cloud Storage
 * Returns the public URL
 */
export async function uploadScreenshot(buffer: Buffer | string, filename: string): Promise<string> {
    try {
        const bucketName = process.env.GCS_BUCKET || `${projectId}-screenshots`;
        const bucket = storage.bucket(bucketName);
        const file = bucket.file(`screenshots/${filename}`);

        console.log(`📡 [GCS] Uploading screenshot to ${bucketName}...`);

        const imageBuffer = typeof buffer === 'string' ? Buffer.from(buffer, 'base64') : buffer;

        await file.save(imageBuffer, {
            metadata: { contentType: 'image/jpeg' },
            public: true,
        });

        const publicUrl = `https://storage.googleapis.com/${bucketName}/screenshots/${filename}`;
        return publicUrl;
    } catch (error) {
        console.error('❌ [GCS] Failed to upload screenshot:', error);
        throw error;
    }
}
