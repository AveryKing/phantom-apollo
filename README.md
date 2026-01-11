# Phantom Apollo: Autonomous Business Development System

**Phantom Apollo** is an autonomous AI system designed to automate the entire business development lifecycle: niche research, lead prospecting, and personalized outreach.

## 🚀 Mission
Target: **$5k MRR** through fully autonomous outbound campaigns.

## 🧠 Core Architecture
The system is built on **LangGraph** (TypeScript) and orchestrated as a directed acyclic graph (DAG) of specialized agents:

1.  **Research Agent**: Discovers high-potential niches and pain points using Google Search & Gemini 2.0 Flash with Grounding.
2.  **Prospecting Agent**: Finds leads (URLs, emails) that match the niche criteria.
3.  **Outreach Agent**: Drafts hyper-personalized emails based on specific pain points.
4.  **Feedback Loop**: Analyzes campaign performance to optimize future research.

## 🛠 Tech Stack
-   **Orchestration**: LangGraph, LangChain
-   **AI Models**: Gemini 2.0 Flash (via Vertex AI & Google GenAI)
-   **Database**: Supabase (PostgreSQL + pgvector)
-   **Execution**: Google Cloud Run Jobs (Dockerized)
-   **Grounding**: Vertex AI Search
-   **Documentation**: Self-maintaining Markdown knowledge base

## 📂 Project Structure
-   `src/agents/`: Agent logic and graph nodes
-   `src/tools/`: Wrappers for external APIs (search, db, email)
-   `docs/`: Comprehensive project documentation
-   `.agent/`: Knowledge base and workflows for AI agents

## 🚦 Getting Started

### Prerequisites
-   Node.js v20+
-   Supabase Project
-   Google Cloud Project (Vertex AI enabled)

### Setup
1.  Clone the repository
2.  `npm install`
3.  Copy `.env.example` to `.env` and fill in secrets
4.  `npm run build`

### Running Locally
```bash
# Run the full pipeline in Beast Mode
npx ts-node scripts/test-beast-mode.ts

# Run the API server with Discord simulation
SIMULATE_TASKS=true npm run dev:server
```

## 📄 Documentation
-   [Project Status](docs/STATUS.md)
-   [Issue Tracker](docs/ISSUES.md)
-   [Agent Handbook](docs/setup/AGENT_HANDBOOK.md)
-   [Architecture Decisions](.agent/knowledge/decisions.md)

---
*Built with Antigravity*
