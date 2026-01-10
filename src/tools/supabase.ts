
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase credentials NOT found. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
}

export const supabase: SupabaseClient = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseKey || 'placeholder'
);

/**
 * Generic helper to select data safely
 */
export async function safeSelect<T>(table: string, columns: string = '*'): Promise<T[] | null> {
    if (!supabaseUrl) return null;
    const { data, error } = await supabase.from(table).select(columns);
    if (error) {
        console.error(`Error selecting from ${table}:`, error);
        return null;
    }
    return data as T[];
}

/**
 * Log agent execution results to the database
 */
export async function logAgentAction(
    agentName: string,
    status: 'started' | 'completed' | 'failed',
    summary: object,
    errorMessage?: string,
    durationSeconds?: number
) {
    if (!supabaseUrl) return;

    const { error } = await supabase.from('agent_logs').insert({
        agent_name: agentName,
        status: status,
        results_summary: summary,
        error_message: errorMessage,
        execution_time_seconds: durationSeconds,
    });

    if (error) {
        console.error('Failed to write agent log:', error);
    }
}

/**
 * Generic helper to insert data safely
 */
export async function insertRecord(table: string, record: object) {
    if (!supabaseUrl) {
        console.warn(`[Mock DB] Would insert into ${table}:`, record);
        return;
    }
    const { error } = await supabase.from(table).insert(record);
    if (error) {
        console.error(`Error inserting into ${table}:`, error);
        throw error;
    }
}
