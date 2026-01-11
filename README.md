# 🚀 Phantom Apollo: Autonomous B2B Lead Generation System

**Phantom Apollo** is a production-ready AI system that automates the entire B2B sales pipeline: market research, lead discovery, visual analysis, and personalized outreach.

[![Deploy](https://img.shields.io/badge/deploy-Cloud%20Run-blue)](https://cloud.google.com/run)
[![LangGraph](https://img.shields.io/badge/LangGraph-1.0-green)](https://github.com/langchain-ai/langgraph)
[![Gemini](https://img.shields.io/badge/Gemini-2.0%20Flash-orange)](https://ai.google.dev/gemini-api)

---

## ✨ Features

- 🧠 **Multi-Agent Pipeline**: Research → Prospecting → Vision Analysis → Outreach
- 🔍 **Intelligent Research**: AI-powered niche discovery with market scoring
- 👁️ **Visual Analysis**: Multimodal website analysis using Gemini 2.0 Flash
- ✉️ **Personalized Outreach**: Context-aware email generation
- 🎯 **Human-in-the-Loop**: Approval gates for quality control
- 📊 **Full Observability**: Langfuse tracing for every operation
- ☁️ **Production Ready**: Deployed on Cloud Run with CI/CD

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DISCOVERY BRAIN (Sync)                    │
│  ┌──────────┐   ┌──────────┐   ┌──────┐   ┌─────────────┐  │
│  │ Research │──▶│ Analyze  │──▶│ HITL │──▶│ Prospecting │  │
│  │  Agent   │   │  \u0026 Score │   │      │   │    Agent    │  │
│  └──────────┘   └──────────┘   └──────┘   └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  PROCESSING BRAIN (Async)                    │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐                │
│  │ Vision   │──▶│ Outreach │──▶│ Email    │                │
│  │ Analysis │   │ Drafting │   │ Queue    │                │
│  └──────────┘   └──────────┘   └──────────┘                │
│         (Cloud Tasks - Throttled \u0026 Resilient)              │
└─────────────────────────────────────────────────────────────┘
```

**Split-Brain Design:**
- **Discovery Brain**: Fast, synchronous lead discovery
- **Processing Brain**: Async, throttled processing to respect API limits

---

## 🚦 Quick Start

### Prerequisites
- Node.js 20+
- Google Cloud Project (Vertex AI enabled)
- Supabase Project
- API Keys: Gemini, Google Search, Resend (optional)

### 1. Clone \u0026 Install
```bash
git clone https://github.com/AveryKing/phantom-apollo.git
cd phantom-apollo
npm install --legacy-peer-deps
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your API keys
```

**Required Variables:**
```env
GOOGLE_CLOUD_PROJECT=your-project-id
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-key
GOOGLE_SEARCH_API_KEY=your-key
GOOGLE_SEARCH_ENGINE_ID=your-cx
```

### 3. Run Development Servers

**Backend (LangGraph):**
```bash
npm run langgraph:dev
# Server runs at http://localhost:2024
```

**Frontend (React UI):**
```bash
cd agent-chat-ui
npm install
npm run dev
# UI runs at http://localhost:3000
```

### 4. Test the System
```bash
# CLI test
npx tsx scripts/test-cli-chat.ts "Hunt for AI automation agencies in healthcare"

# Or use the web UI at http://localhost:3000
```

---

## 📖 How It Works

### 1. **Research Phase**
The Research Agent:
- Generates search queries based on your niche
- Uses Google Search + Gemini 2.0 Flash with Grounding
- Extracts pain points and market signals
- Scores market potential (0-10)

### 2. **Human Approval**
- System pauses and presents research findings
- You approve or reject before prospecting
- Ensures quality control

### 3. **Prospecting Phase**
The Prospecting Agent:
- Searches for companies matching criteria
- Extracts contact information
- Queues leads for async processing

### 4. **Async Processing**
Cloud Tasks processes each lead:
- **Vision Analysis**: Screenshots + Gemini multimodal analysis
- **Outreach Drafting**: Personalized emails based on pain points
- **Email Queue**: Ready-to-send outreach

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Orchestration** | LangGraph, LangChain |
| **AI Models** | Gemini 2.0 Flash (Vertex AI) |
| **Database** | Supabase (PostgreSQL + pgvector) |
| **Frontend** | React, TypeScript, Vite |
| **Deployment** | Cloud Run, GitHub Actions |
| **Observability** | Langfuse |
| **Email** | Resend |
| **Storage** | Google Cloud Storage |

---

## 📂 Project Structure

```
phantom-apollo/
├── src/
│   ├── agents/          # Agent nodes (research, prospecting, vision, outreach)
│   ├── tools/           # External API wrappers (search, db, email, gcp)
│   ├── processors/      # Async processing pipeline
│   ├── types/           # TypeScript type definitions
│   ├── graph.ts         # Main LangGraph workflow
│   └── assistant.ts     # Chat assistant wrapper
├── agent-chat-ui/       # React frontend
├── scripts/             # Utility scripts (testing, audit, deployment)
├── docs/                # Documentation
├── .agent/              # AI agent knowledge base \u0026 workflows
└── tests/               # Test suite
```

---

## 🚀 Deployment

The system auto-deploys to Cloud Run on push to `main`:

```bash
# Trigger deployment
git push origin main

# Or manually deploy
gcloud run deploy phantom-apollo \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

**Production URL:** `https://phantom-apollo-[hash].a.run.app`

---

## 🧪 Testing

```bash
# Run system audit
npx tsx scripts/system-audit.ts

# Run unit tests
npm test

# Test CLI chat
npx tsx scripts/test-cli-chat.ts "Your message"

# Check thread state
npx tsx scripts/check-thread.ts <thread_id>
```

---

## 📊 Monitoring

- **Langfuse Dashboard**: [us.cloud.langfuse.com](https://us.cloud.langfuse.com)
- **Cloud Run Logs**: GCP Console
- **System Audit**: `npx tsx scripts/system-audit.ts`

---

## 🤝 Contributing

1. Create an issue describing the feature/bug
2. Follow the `/execute-issue` workflow
3. Submit a PR with conventional commits

---

## 📄 Documentation

- [📋 Project Status](docs/STATUS.md)
- [🐛 Issue Tracker](docs/ISSUES.md)
- [📚 Agent Handbook](docs/setup/AGENT_HANDBOOK.md)
- [🏛️ Architecture Decisions](.agent/knowledge/decisions.md)
- [🔍 System Audit Report](docs/AUDIT_REPORT.md)
- [🔄 Workflows](.agent/workflows/)

---

## 📝 License

Apache 2.0 - See [LICENSE](LICENSE) for details

---

## 🙏 Acknowledgments

Built with:
- [LangGraph](https://github.com/langchain-ai/langgraph) by LangChain
- [Google Gemini](https://ai.google.dev/gemini-api) 2.0 Flash
- [Supabase](https://supabase.com)
- [Antigravity](https://antigravity.google) AI Development Platform

---

**Status:** ✅ Production Ready | **Version:** 1.0.0 | **Last Updated:** 2026-01-11

*Autonomous B2B lead generation at scale* 🚀
