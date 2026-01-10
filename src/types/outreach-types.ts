
/**
 * Context for a specific lead gathered during prospecting.
 */
export interface LeadResearchContext {
    name: string;
    company: string;
    role: string;
    recent_activity?: string;
    news_signals?: string[];
    pain_points_referenced?: string[];
}

/**
 * State for the Outreach Agent node/graph.
 */
export interface OutreachState {
    /** The lead being messaged */
    leadId: string;

    /** Deep research context about the lead */
    context: LeadResearchContext;

    /** The specific channel for this message */
    channel: 'email' | 'linkedin' | 'twitter';

    /** Background niche context for grounding the value prop */
    nicheContext: string;

    /** The generated draft */
    draft?: {
        subject?: string;
        content: string;
    };

    /** Status of the outreach process */
    status: 'analyzing' | 'drafting' | 'completed' | 'failed';

    /** Any error message */
    error?: string;
}
