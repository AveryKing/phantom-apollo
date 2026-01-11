/**
 * Centralized configuration with environment variable validation and fallbacks
 */

import dotenv from 'dotenv';
dotenv.config();

/**
 * Get required environment variable with validation
 */
function getRequiredEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

/**
 * Get optional environment variable with fallback
 */
function getOptionalEnv(key: string, fallback: string): string {
    return process.env[key] || fallback;
}

// Google Cloud Configuration
export const GOOGLE_CLOUD_PROJECT = getOptionalEnv('GOOGLE_CLOUD_PROJECT', '');
export const GOOGLE_CLOUD_LOCATION = getOptionalEnv('GOOGLE_CLOUD_LOCATION', 'us-central1');
export const GOOGLE_SEARCH_API_KEY = getOptionalEnv('GOOGLE_SEARCH_API_KEY', '');
export const GOOGLE_SEARCH_ENGINE_ID = getOptionalEnv('GOOGLE_SEARCH_ENGINE_ID', getOptionalEnv('GOOGLE_CX', ''));
export const GCS_BUCKET = getOptionalEnv('GCS_BUCKET', `${GOOGLE_CLOUD_PROJECT}-screenshots`);

// Supabase Configuration
export const SUPABASE_URL = getOptionalEnv('SUPABASE_URL', '');
export const SUPABASE_KEY = getOptionalEnv(
    'SUPABASE_SERVICE_ROLE_KEY',
    getOptionalEnv('SUPABASE_KEY', getOptionalEnv('SUPABASE_ANON_KEY', ''))
);

// Langfuse Configuration
export const LANGFUSE_PUBLIC_KEY = getOptionalEnv('LANGFUSE_PUBLIC_KEY', '');
export const LANGFUSE_SECRET_KEY = getOptionalEnv('LANGFUSE_SECRET_KEY', '');
export const LANGFUSE_BASEURL = getOptionalEnv('LANGFUSE_BASEURL', 'https://us.cloud.langfuse.com');

// Resend Configuration
export const RESEND_API_KEY = getOptionalEnv('RESEND_API_KEY', '');

// Cloud Tasks Configuration
export const SERVICE_URL = getOptionalEnv('SERVICE_URL', '');
export const SIMULATE_TASKS = getOptionalEnv('SIMULATE_TASKS', 'false') === 'true';

/**
 * Validate critical configuration on startup
 */
export function validateConfig(): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    // Check critical services
    if (!GOOGLE_CLOUD_PROJECT) missing.push('GOOGLE_CLOUD_PROJECT');
    if (!SUPABASE_URL) missing.push('SUPABASE_URL');
    if (!SUPABASE_KEY) missing.push('SUPABASE_KEY');

    return {
        valid: missing.length === 0,
        missing
    };
}

/**
 * Log configuration status (without exposing secrets)
 */
export function logConfigStatus(): void {
    console.log('📋 Configuration Status:');
    console.log(`  ✓ Google Cloud Project: ${GOOGLE_CLOUD_PROJECT || '❌ NOT SET'}`);
    console.log(`  ✓ Supabase URL: ${SUPABASE_URL ? '✅ SET' : '❌ NOT SET'}`);
    console.log(`  ✓ Langfuse: ${LANGFUSE_PUBLIC_KEY ? '✅ SET' : '⚠️  NOT SET (tracing disabled)'}`);
    console.log(`  ✓ Google Search: ${GOOGLE_SEARCH_API_KEY ? '✅ SET' : '⚠️  NOT SET'}`);
    console.log(`  ✓ Resend Email: ${RESEND_API_KEY ? '✅ SET' : '⚠️  NOT SET'}`);
}
