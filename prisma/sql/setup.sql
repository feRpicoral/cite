-- Cite — post-init database setup
--
-- Run after `prisma migrate deploy` (or `prisma db push` in dev) to install:
--   1. pgvector extension
--   2. trigger that mirrors Supabase auth.users → public.users
--   3. is_member_of() function + RLS policies on every tenant table
--
-- Apply via:
--   psql "$DATABASE_URL" -f prisma/sql/setup.sql
-- or paste into the Supabase SQL editor.
--
-- Idempotent — safe to re-run as the tenant-table list grows.

-- ─────────────────────────────────────────────────────────────
-- pgvector
-- ─────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS vector;

-- ─────────────────────────────────────────────────────────────
-- public.users ↔ auth.users sync trigger
-- Fires on insert + update so OAuth name/avatar changes propagate.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_changed ON auth.users;
CREATE TRIGGER on_auth_user_changed
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user();

-- ─────────────────────────────────────────────────────────────
-- Row Level Security — defense in depth
--
-- Application-layer scoping happens via Prisma `$extends` (lib/db/with-org.ts).
-- These RLS policies are the second layer: any direct Supabase client query
-- (Storage, Realtime, raw RPC) is still bound to the caller's memberships.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_member_of(target_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid() AND org_id = target_org
  );
$$;

DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'invites',
    'collections',
    'documents',
    'document_parts',
    'document_chunks',
    'embeddings',
    'conversations',
    'messages',
    'message_citations',
    'comments',
    'comment_replies',
    'citation_audits',
    'message_metrics'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    -- FORCE so the table owner (the migration/runtime role) is also bound by
    -- RLS; plain ENABLE leaves owners able to bypass every policy.
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I FOR ALL USING (public.is_member_of(org_id))',
      t
    );
  END LOOP;
END $$;

-- Organizations: visible if you're a member.
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_visibility ON public.organizations;
CREATE POLICY org_visibility ON public.organizations
  FOR SELECT
  USING (public.is_member_of(id));

-- Memberships: see your own + everyone in your orgs.
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS membership_visibility ON public.memberships;
CREATE POLICY membership_visibility ON public.memberships
  FOR SELECT
  USING (user_id = auth.uid() OR public.is_member_of(org_id));

-- Users: see yourself and other users in your orgs.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_visibility ON public.users;
CREATE POLICY user_visibility ON public.users
  FOR SELECT
  USING (
    id = auth.uid()
    OR id IN (
      SELECT m.user_id FROM public.memberships m
      WHERE public.is_member_of(m.org_id)
    )
  );

-- ─────────────────────────────────────────────────────────────
-- Realtime — messages stream + channel authorization
--
-- The chat UI subscribes to postgres_changes on public.messages
-- (lib/realtime/message-sync.ts). That stream is silent unless the table is
-- a member of the supabase_realtime publication; Supabase never adds app
-- tables automatically. REPLICA IDENTITY FULL so UPDATE/DELETE payloads carry
-- the old row (INSERT works without it, but keep the stream complete).
-- ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'messages'
     )
  THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
  END IF;
END $$;

ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Realtime channel authorization (best-effort; the realtime schema only
-- exists on Supabase). Private channels run join/read through RLS on
-- realtime.messages, where realtime.topic() is the channel name. The app
-- uses `messages:<conversationId>` and `presence:conversation:<conversationId>`,
-- so authorize a member whose membership covers the conversation's org.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'realtime' AND table_name = 'messages'
  ) THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS cite_conversation_channels ON realtime.messages';
    EXECUTE $pol$
      CREATE POLICY cite_conversation_channels ON realtime.messages
        FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1
            FROM public.conversations c
            WHERE realtime.topic() IN (
                'messages:' || c.id::text,
                'presence:conversation:' || c.id::text
              )
              AND public.is_member_of(c.org_id)
          )
        )
    $pol$;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- pgvector indexes — multi-tenant pattern
--
-- HNSW doesn't support a composite (org_id, embedding) index. Instead:
-- btree on org_id narrows to tenant rows, HNSW on embedding orders the
-- narrowed set. The planner uses both.
-- ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS embeddings_org_idx
  ON public.embeddings (org_id);

-- halfvec_cosine_ops because the column is halfvec(2048); HNSW's vector_*
-- ops cap at 2000 dims, halfvec_* goes to 4000.
CREATE INDEX IF NOT EXISTS embeddings_hnsw
  ON public.embeddings
  USING hnsw (embedding halfvec_cosine_ops);

-- ─────────────────────────────────────────────────────────────
-- Full-text search index for the keyword side of hybrid retrieval.
-- ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS document_chunks_text_search_idx
  ON public.document_chunks
  USING gin (to_tsvector('simple', text));

-- ─────────────────────────────────────────────────────────────
-- Storage bucket for uploaded documents (private; signed URLs only).
-- ─────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cite-documents',
  'cite-documents',
  false,
  104857600,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/html',
    'text/markdown',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
