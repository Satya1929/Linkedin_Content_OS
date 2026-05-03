# LinkedIn Content Engine

Local-first LinkedIn content system for AI and developer authority building.

## What Works In This Baseline

- Local web dashboard
- Raw context and article-link draft generation
- Markdown prompt rules
- Local model provider abstraction with Ollama-compatible detection
- Deterministic fallback when no local model is available
- Quality scoring and similarity warning
- Draft approval/rejection/editing
- Manual scheduling and publishing export
- Manual analytics CSV import
- Weekly insight generation with prompt-rule approval workflow
- Trusted AI news digest from RSS-style official/research/community feeds
- Ranked news clusters with repetition warnings and one-click news-to-draft generation
- Structured visual concepts for workflow diagrams, comparisons, and pattern-breaker images
- Carousel outlines with copyable slide text and visual notes
- Prisma schema for the intended Postgres/pgvector backend

## Run Locally

```bash
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:3000`.

## Optional Services

```bash
docker compose up -d
npm.cmd run prisma:generate
```

The app currently uses a local JSON store for immediate usability. The Prisma schema is included so the durable Postgres path can be adopted phase by phase.

## Local Model Setup

The app checks `OLLAMA_HOST` and falls back to deterministic generation if Ollama is not reachable. It does not download models.

## LinkedIn

The MVP does not scrape LinkedIn. Start with manual publishing and CSV analytics import. Add official OAuth and posting only after LinkedIn developer credentials are ready.

## News Mode

Use the dashboard's News Mode panel to fetch compliant sources, rank clusters, and generate a thesis-led draft from a selected item. The current source set uses RSS-style feeds and avoids X, LinkedIn, Discord, Slack, and private communities.

## Visuals And Carousels

Mixed and image drafts include reusable visual concepts with positive and negative prompts. Carousel drafts include seven slide outlines with visual notes that can be copied into a design tool or future PDF/carousel pipeline.
