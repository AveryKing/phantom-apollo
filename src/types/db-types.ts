
export interface Niche {
    id?: string;
    name: string;
    description?: string;
    embedding?: number[]; // Vector(768)
    status: 'active' | 'exhausted';
    created_at?: string;
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
    pain_points?: any; // JSONB
    email_draft?: string;
    evaluation_score?: any; // JSONB
    context?: any;
    score?: number;
    stage?: string;

    sent_to_discord?: boolean;
    created_at?: string;
}
