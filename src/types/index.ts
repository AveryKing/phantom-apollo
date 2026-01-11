import { ResearchState } from './research-state';

export * from './research-state';
export * from './outreach-types';

/**
 * The Master State for the Business Development Agent.
 * Inherits all research fields and adds prospecting/outreach data.
 */
import { Lead } from './db-types';

import { BaseMessage } from "@langchain/core/messages";

/**
 * The Master State for the Business Development Agent.
 * Inherits all research fields and adds prospecting/outreach data.
 */
export interface AgentState extends ResearchState {
    /** Leads found during prospecting */
    leads: Lead[];

    /** Final findings summary (if different from researchNotes) */
    findings?: string;

    /** Messages for streaming updates to UI */
    messages?: BaseMessage[];
}
