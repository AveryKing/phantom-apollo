
# Phantom Apollo

A serverless B2B autonomous agent built with Node.js, Google Cloud Run, and Vertex AI.

## Overview

Phantom Apollo acts as an automated business development analyst. It performs daily market research, analyzes prospect websites using headless Chrome (Puppeteer), and generates outreach drafts seeded with visual context.

The architecture is entirely event-driven and scale-to-zero.

## Stack

- **Runtime**: Node.js 20 (TypeScript)
- **Infrastructure**: Google Cloud Run (Service) + Cloud Scheduler
- **AI**: Gemini 2.0 Flash (Multimodal) + Vertex AI Embeddings
- **Database**: Supabase (Postgres + pgvector)
- **Interface**: Discord Slash Commands

## Features

- **Niche Discovery**: Brainstorms emerging B2B verticals daily.
- **Visual Analysis**: Visits landing pages to score "design vibes" using computer vision.
- **De-duplication**: Uses vector search to prevent researching the same niche twice.
- **Auto-Drafting**: Composes cold emails tailored to the prospect's visual maturity.

## Running Locally

1. Clone the repo
2. `npm install`
3. Set up `.env` (see config)
4. `npm run dev`

## Deployment

CI/CD is handled via GitHub Actions to Google Artifact Registry.
