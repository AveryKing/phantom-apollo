
export interface Niche {
    id?: string;
    name: string;
    description?: string;
    embedding?: number[]; // Vector(768)
    status: 'active' | 'exhausted';
    created_at?: string;
}

export interface PainPoint {
    description: string;
    severity?: 'low' | 'medium' | 'high';
    category?: string;
}

export interface EvaluationScore {
    hallucination_check?: number; // 0-1 score
    relevance?: number; // 0-1 score
    professionalism?: number; // 0-1 score
    overall?: number; // 0-1 score
    feedback?: string;
}

export interface LeadContext {
    source?: string;
    search_query?: string;
    discovery_date?: string;
    metadata?: Record<string, unknown>;
}

export interface Lead {
    id: string;
    niche_id: string;

    // Core Data (Grounded/Extraction)
    name?: string;
    company?: string;
    role?: string;
    linkedin_url?: string;

    // Legacy/Schema compatibility
    company_name?: string;
    url?: string;

    // Vision Data
    screenshot_url?: string;
    visual_vibe_score?: number; // 1-10
    visual_analysis?: string;

    // Outreach Data
    pain_points?: PainPoint[]; // JSONB array
    email_draft?: string;
    evaluation_score?: EvaluationScore; // JSONB object
    context?: LeadContext; // JSONB object
    score?: number;
    stage?: string;

    sent_to_discord?: boolean;
    created_at?: string;
}
