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
-- Idempotent — safe to re-run as the tenant-table list grows in later phases.

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
    'invites'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I FOR ALL USING (public.is_member_of(org_id))',
      t
    );
  END LOOP;
END $$;

-- Organizations: visible if you're a member.
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_visibility ON public.organizations;
CREATE POLICY org_visibility ON public.organizations
  FOR SELECT
  USING (public.is_member_of(id));

-- Memberships: see your own + everyone in your orgs.
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS membership_visibility ON public.memberships;
CREATE POLICY membership_visibility ON public.memberships
  FOR SELECT
  USING (user_id = auth.uid() OR public.is_member_of(org_id));

-- Users: see yourself and other users in your orgs.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
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
