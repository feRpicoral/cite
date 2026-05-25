# Cite

Agentic RAG with clickable citations and a synced document viewer.

Teams upload their documents (PDF, DOCX, HTML, Markdown) and chat with them in natural language. Every answer is grounded by inline citations. Click one and the source document opens in a side panel, scrolled to the exact region and highlighted.

Inspired by Google NotebookLM, with two differentiators:

- **Genuinely agentic retrieval**: classify, decompose, hybrid + rerank, sufficiency check, iterate when needed. Not a single linear vector lookup.
- **Citation fidelity**: every citation deterministically maps to a bounding box (PDFs) or DOM range (HTML-family) in the source. An LLM-judge audit runs on every answer; the verdicts surface in an admin dashboard.

## Stack

- **Next.js 16** (App Router, RSC, streaming) + **TypeScript**
- **Yarn 4** via Corepack, Node 24 LTS
- **Tailwind v4** + **shadcn/ui** (Radix Nova preset, custom warm-stone + teal palette)
- **Prisma 7** + **Supabase** (Auth + Postgres + Storage + Realtime + pgvector)
- **next-intl 4** (en-US, pt-BR)
- **Inngest 4** for background ingestion + audit jobs
- **Vercel AI SDK** + **Anthropic** (Sonnet 4.6 synthesis, Haiku 4.5 classify/judge)
- **Voyage 3 Large** embeddings + **Voyage Rerank 2.5**
- **LlamaParse** for layout-aware PDF parsing; **mammoth** + **rehype/remark** for the HTML family
- **pdfjs-dist** for in-browser PDF rendering

## Run it yourself

The project is intentionally env-gated end-to-end. It builds, lints, types, and tests cleanly with zero third-party keys. You only need credentials when you want to actually ingest a document, ask a question, or render a PDF in the browser.

### 1. Local dependencies

```bash
nvm use   # picks up Node 24 from .nvmrc
corepack enable
yarn install
yarn db:generate
```

### 2. Create a Supabase project

1. Sign up at [supabase.com](https://supabase.com).
2. Create a new project. In **Project Settings > API Keys**, copy the **publishable** key (`sb_publishable_...`) and create a **secret** key (`sb_secret_...`). These replace the legacy `anon` and `service_role` keys.
3. Enable the **pgvector** extension under Database > Extensions.
4. Copy the Postgres connection string from Database > Connection String.

### 3. Set environment variables

```bash
cp .env.example .env.local
```

Fill in:

| Var                                        | Required for                             | Where                                                  |
| ------------------------------------------ | ---------------------------------------- | ------------------------------------------------------ |
| `NEXT_PUBLIC_APP_URL`                      | Auth redirects + metadata                | `http://localhost:3000` in dev                         |
| `DATABASE_URL`                             | Prisma at runtime + migrations           | Supabase connection string                             |
| `NEXT_PUBLIC_SUPABASE_URL`                 | Browser + server clients                 | Supabase project URL                                   |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`     | Browser + server clients                 | Supabase API, `sb_publishable_...`                     |
| `SUPABASE_SECRET_KEY`                      | Storage uploads, admin lookups           | Supabase API, `sb_secret_...`                          |
| `VOYAGE_API_KEY`                           | Ingestion (embeddings) + rerank          | [voyageai.com](https://www.voyageai.com)               |
| `LLAMA_CLOUD_API_KEY`                      | PDF parsing                              | [cloud.llamaindex.ai](https://cloud.llamaindex.ai)     |
| `ANTHROPIC_API_KEY`                        | Synthesis + contextual retrieval + audit | [console.anthropic.com](https://console.anthropic.com) |
| `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` | Production only                          | [inngest.com](https://inngest.com)                     |

DOCX, HTML, and Markdown ingestion work without `LLAMA_CLOUD_API_KEY`; only PDFs need it. Contextual retrieval is skipped when `ANTHROPIC_API_KEY` is missing (chunks still embed, quality drops).

### 4. Apply the schema

```bash
yarn db:migrate              # creates tables
yarn db:setup                # installs pgvector + RLS + storage bucket + auth trigger
```

`yarn db:setup` runs `prisma/sql/setup.sql` against `DATABASE_URL`. Idempotent, safe to re-run as the tenant-table list grows.

### 5. Start the dev server

```bash
# Terminal 1: Next.js
yarn dev

# Terminal 2: Inngest dev server (for ingestion + audit jobs)
yarn dlx inngest-cli@latest dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, create your org, and upload a document.

## Project layout

```
src/
  app/
    (app)/            # Signed-in app shell
      admin/audit/    # Citation-accuracy dashboard
      conversations/  # Chat + document viewer
      dashboard/
      documents/      # Collections + library
    (auth)/           # Sign-in / sign-up
    (onboarding)/     # Create org
    [locale]/         # Marketing tree (en-US, pt-BR)
    api/
      chat/           # Streaming synthesis (Vercel AI SDK)
      comments/       # Threaded comments
      conversations/  # Conversation CRUD
      documents/      # Upload + signed URL + part body
      inngest/        # Inngest workflow webhook
      retrieve/       # Admin-only retrieval probe
  components/
    chat/             # Message bubble, citation chip, composer
    comments/         # Comment thread + popover
    presence/         # Realtime avatars
    viewer/           # Polymorphic PDF + HTML viewer with highlight overlay
    ui/               # shadcn primitives
  i18n/               # next-intl config + URL-slug to locale mapping
  lib/
    agents/           # Hand-rolled retrieval state machine
    audit/            # LLM-judge citation audit
    auth/             # Session helpers
    chat/             # Synthesis prompt + citation parser
    db/               # Prisma client + tenant-scoping $extends + branded IDs
    ingestion/        # Multi-format parser interface + chunker + embedder + pipeline
    inngest/          # Background workflows
    realtime/         # Presence + postgres_changes subscriptions
    retrieval/        # Tenant-safe vector + keyword search + RRF + rerank
    supabase/         # Server/browser/admin Supabase clients
    viewer/           # PDF coord conversion, HTML range locator
prisma/
  schema.prisma
  sql/setup.sql
scripts/
  apply-rls.ts
  eval.ts             # Offline retrieval eval (yarn eval --collection <uuid>)
eval/                 # Fixture format docs + example
```

## Quality + safety

- **Multi-tenant isolation** in four layers: branded TypeScript IDs at call sites; Prisma `$extends` injects `orgId` on every multi-tenant query; raw SQL vector search filters by `WHERE org_id = $1` before the `ORDER BY embedding <-> $2`; Postgres RLS via `is_member_of(org_id)`.
- **Conventional Commits**, header-only. ESLint 9 flat config + Prettier + simple-import-sort, enforced via Husky + lint-staged + commitlint.
- **CI** (`.github/workflows/ci.yml`): typecheck + lint + test + build on every push and PR.
- **Test coverage** focused on the load-bearing pieces: chunking, citation parsing, retrieval fusion, agent state machine, viewer coord conversion, citation audit claim extraction.

## Eval harness

```bash
yarn eval --collection <collection-uuid>
```

Runs the hybrid retriever against `eval/fixtures.json` (template at `eval/fixtures.example.json`) and prints precision@k / recall@k / MRR. See `eval/README.md`.

## Deploy

The codebase targets Vercel + Supabase out of the box. Deployment steps:

1. Import the repo into Vercel; set the env vars from step 3 above.
2. Add the Inngest integration in Vercel; wire `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`.
3. Set `NEXT_PUBLIC_APP_URL` to your Vercel URL so Supabase email links land at the right host.
