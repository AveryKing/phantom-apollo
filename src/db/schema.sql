-- Niches being researched
CREATE TABLE niches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    pain_points JSONB,
    market_size_score INTEGER CHECK (market_size_score BETWEEN 1 AND 10),
    competition_score INTEGER CHECK (competition_score BETWEEN 1 AND 10),
    willingness_to_pay_score INTEGER CHECK (willingness_to_pay_score BETWEEN 1 AND 10),
    overall_score INTEGER,
    research_notes TEXT,
    status TEXT DEFAULT 'researching' CHECK (status IN ('researching', 'validated', 'active', 'paused', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Qualified leads
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    niche_id UUID REFERENCES niches(id),
    name TEXT,
    company TEXT,
    role TEXT,
    linkedin_url TEXT,
    twitter_handle TEXT,
    email TEXT,
    research_context JSONB, -- pain points, recent activity, buying signals
    qualification_score INTEGER CHECK (qualification_score BETWEEN 1 AND 10),
    stage TEXT DEFAULT 'new' CHECK (stage IN ('new', 'researched', 'drafted', 'sent', 'replied', 'interested', 'not_interested', 'converted')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Outreach messages (drafts and sent)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id),
    channel TEXT CHECK (channel IN ('email', 'linkedin', 'twitter')),
    subject TEXT,
    content TEXT,
    drafted_at TIMESTAMPTZ DEFAULT now(),
    sent_at TIMESTAMPTZ,
    sent_by TEXT DEFAULT 'manual', -- 'manual' or 'automated' (future)
    response_received_at TIMESTAMPTZ,
    response_content TEXT,
    response_sentiment TEXT CHECK (response_sentiment IN ('interested', 'not_interested', 'neutral', 'question')),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready_to_send', 'sent', 'replied', 'bounced')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Agent execution logs
CREATE TABLE agent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name TEXT NOT NULL,
    execution_date DATE DEFAULT CURRENT_DATE,
    status TEXT CHECK (status IN ('started', 'completed', 'failed')),
    results_summary JSONB,
    error_message TEXT,
    execution_time_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_niches_status ON niches(status);
CREATE INDEX idx_niches_score ON niches(overall_score DESC);
CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_leads_niche ON leads(niche_id);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_lead ON messages(lead_id);
CREATE INDEX idx_agent_logs_date ON agent_logs(execution_date DESC);
