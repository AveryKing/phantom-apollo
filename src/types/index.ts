import { ResearchState } from './research-state';

export * from './research-state';
export * from './outreach-types';

/**
 * The Master State for the Business Development Agent.
 * Inherits all research fields and adds prospecting/outreach data.
 */
import { Lead } from './db-types';

/**
 * The Master State for the Business Development Agent.
 * Inherits all research fields and adds prospecting/outreach data.
 */
export interface AgentState extends ResearchState {
    /** Leads found during prospecting */
    leads: Lead[];

    /** Final findings summary (if different from researchNotes) */
    findings?: string;
}
