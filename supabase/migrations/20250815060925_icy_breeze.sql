/*
  # CHESS Quest System Database Schema

  1. New Tables
    - `quest_nodes` - Reusable map locations for quests
    - `quest_templates` - Admin-created templates for different quest types
    - `quests` - Active quests created from templates (require approval)
    - `quest_submissions` - Student answers/uploads for quests
    - `coin_wallets` - User coin balances
    - `coin_ledger` - All coin transactions with audit trail

  2. New Enums
    - `quest_type` - MCQ, text, or video quest types
    - `quest_status` - Draft, submitted, approved, rejected, archived
    - `submission_status` - Pending, accepted, rejected, autograded

  3. Security
    - Enable RLS on all new tables
    - Role-based policies using existing actor_role() functions
    - Storage policies for video uploads

  4. Triggers
    - Auto-deduct coins from approver wallet on quest approval
    - Auto-credit student wallet on submission acceptance
    - Updated_at triggers for data freshness

  5. Business Logic
    - Only master_admin can approve quests (requires sufficient wallet balance)
    - MCQ submissions auto-grade; Text/Video require manual review
    - One submission per user per quest
    - Approved quests appear on map for students
*/

-- 1) Create enums for quest system
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
                 WHERE n.nspname='public' AND t.typname='quest_type') THEN
    EXECUTE $$CREATE TYPE public.quest_type AS ENUM ('mcq','text','video');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
                 WHERE n.nspname='public' AND t.typname='quest_status') THEN
    EXECUTE $$CREATE TYPE public.quest_status AS ENUM ('draft','submitted','approved','rejected','archived');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
                 WHERE n.nspname='public' AND t.typname='submission_status') THEN
    EXECUTE $$CREATE TYPE public.submission_status AS ENUM ('pending','accepted','rejected','autograded');
  END IF;
END$$;

-- 2) Reusable map nodes (optional convenience for common locations)
CREATE TABLE IF NOT EXISTS public.quest_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_key public.persona_key NOT NULL,
  lng double precision NOT NULL,
  lat double precision NOT NULL,
  label text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Templates authored by admins
CREATE TABLE IF NOT EXISTS public.quest_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  qtype public.quest_type NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb, -- MCQ: {options:[{id,text,isCorrect}]}, Text: {maxLen}, Video:{maxSizeMB}
  default_reward int NOT NULL DEFAULT 0 CHECK (default_reward >= 0),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4) Quests created from templates; require approval before visible
CREATE TABLE IF NOT EXISTS public.quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.quest_templates(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  qtype public.quest_type NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  reward_coins int NOT NULL DEFAULT 0 CHECK (reward_coins >= 0),
  status public.quest_status NOT NULL DEFAULT 'draft',
  persona_key public.persona_key NOT NULL,
  lng double precision NOT NULL,
  lat double precision NOT NULL,
  node_id uuid REFERENCES public.quest_nodes(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5) Student submissions
CREATE TABLE IF NOT EXISTS public.quest_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id uuid NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.submission_status NOT NULL DEFAULT 'pending',
  mcq_choice text,              -- chosen option id or value
  text_answer text,
  video_url text,               -- storage path
  score int,                    -- optional score
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quest_id, user_id)    -- one submission per user per quest
);

-- 6) Coin system
CREATE TABLE IF NOT EXISTS public.coin_wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance int NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coin_ledger (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta int NOT NULL,
  kind text NOT NULL CHECK (kind IN ('quest_budget','quest_award','manual_adjust')),
  quest_id uuid REFERENCES public.quests(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7) Updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at() 
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END$$;

DROP TRIGGER IF EXISTS trg_nodes_updated ON public.quest_nodes;
CREATE TRIGGER trg_nodes_updated BEFORE UPDATE ON public.quest_nodes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_templates_updated ON public.quest_templates;
CREATE TRIGGER trg_templates_updated BEFORE UPDATE ON public.quest_templates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_quests_updated ON public.quests;
CREATE TRIGGER trg_quests_updated BEFORE UPDATE ON public.quests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8) Enable RLS on all tables
ALTER TABLE public.quest_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_ledger ENABLE ROW LEVEL SECURITY;

-- 9) Grant base privileges
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.quest_nodes, public.quest_templates, public.quests TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.quest_submissions TO authenticated;
GRANT SELECT ON TABLE public.coin_wallets, public.coin_ledger TO authenticated;

-- 10) RLS Policies

-- quest_nodes: admins manage their nodes; anyone can read active
DROP POLICY IF EXISTS "nodes: select active or admin" ON public.quest_nodes;
CREATE POLICY "nodes: select active or admin" ON public.quest_nodes FOR SELECT
  USING ( active OR role_rank(actor_role()) >= role_rank('org_admin'::public.user_role) );

DROP POLICY IF EXISTS "nodes: upsert own (admin+)" ON public.quest_nodes;
CREATE POLICY "nodes: upsert own (admin+)" ON public.quest_nodes FOR ALL
  USING ( role_rank(actor_role()) >= role_rank('org_admin'::public.user_role) AND created_by = auth.uid() )
  WITH CHECK ( role_rank(actor_role()) >= role_rank('org_admin'::public.user_role) AND created_by = auth.uid() );

-- templates: admins CRUD own; read all
DROP POLICY IF EXISTS "templates: select all" ON public.quest_templates;
CREATE POLICY "templates: select all" ON public.quest_templates FOR SELECT USING ( true );

DROP POLICY IF EXISTS "templates: upsert own (admin+)" ON public.quest_templates;
CREATE POLICY "templates: upsert own (admin+)" ON public.quest_templates FOR ALL
  USING ( role_rank(actor_role()) >= role_rank('org_admin'::public.user_role) AND created_by = auth.uid() )
  WITH CHECK ( role_rank(actor_role()) >= role_rank('org_admin'::public.user_role) AND created_by = auth.uid() );

-- quests: created by admins; visible to students only when approved & active
DROP POLICY IF EXISTS "quests: select by role" ON public.quests;
CREATE POLICY "quests: select by role" ON public.quests FOR SELECT USING (
  CASE
    WHEN role_rank(actor_role()) >= role_rank('org_admin'::public.user_role) THEN true
    ELSE status = 'approved' AND active
  END
);

DROP POLICY IF EXISTS "quests: insert own (admin+)" ON public.quests;
CREATE POLICY "quests: insert own (admin+)" ON public.quests FOR INSERT
  WITH CHECK ( role_rank(actor_role()) >= role_rank('org_admin'::public.user_role) AND created_by = auth.uid() );

DROP POLICY IF EXISTS "quests: update own (admin+)" ON public.quests;
CREATE POLICY "quests: update own (admin+)" ON public.quests FOR UPDATE
  USING ( role_rank(actor_role()) >= role_rank('org_admin'::public.user_role) AND created_by = auth.uid() )
  WITH CHECK ( role_rank(actor_role()) >= role_rank('org_admin'::public.user_role) );

-- master can update any (for approvals)
DROP POLICY IF EXISTS "quests: master update any" ON public.quests;
CREATE POLICY "quests: master update any" ON public.quests FOR UPDATE
  USING ( actor_is_master_admin() ) 
  WITH CHECK ( actor_is_master_admin() );

-- submissions: students upsert own; staff/master can review
DROP POLICY IF EXISTS "subs: select own or staff+" ON public.quest_submissions;
CREATE POLICY "subs: select own or staff+" ON public.quest_submissions FOR SELECT USING (
  user_id = auth.uid() OR role_rank(actor_role()) >= role_rank('staff'::public.user_role)
);

DROP POLICY IF EXISTS "subs: insert own" ON public.quest_submissions;
CREATE POLICY "subs: insert own" ON public.quest_submissions FOR INSERT
  WITH CHECK ( user_id = auth.uid() );

DROP POLICY IF EXISTS "subs: update own pending or staff+" ON public.quest_submissions;
CREATE POLICY "subs: update own pending or staff+" ON public.quest_submissions FOR UPDATE
  USING (
    (user_id = auth.uid() AND status = 'pending') OR role_rank(actor_role()) >= role_rank('staff'::public.user_role)
  )
  WITH CHECK ( true );

-- wallets/ledger: user sees own; staff+ can see all; only authorized users modify
DROP POLICY IF EXISTS "wallets: select own or staff+" ON public.coin_wallets;
CREATE POLICY "wallets: select own or staff+" ON public.coin_wallets FOR SELECT USING (
  user_id = auth.uid() OR role_rank(actor_role()) >= role_rank('staff'::public.user_role)
);

DROP POLICY IF EXISTS "ledger: select own or staff+" ON public.coin_ledger;
CREATE POLICY "ledger: select own or staff+" ON public.coin_ledger FOR SELECT USING (
  user_id = auth.uid() OR role_rank(actor_role()) >= role_rank('staff'::public.user_role)
);

-- 11) Wallet management helper function
CREATE OR REPLACE FUNCTION public.ensure_wallet(u uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.coin_wallets (user_id, balance)
  VALUES (u, 0)
  ON CONFLICT (user_id) DO NOTHING;
END$$;

-- 12) Quest approval trigger with coin deduction
CREATE OR REPLACE FUNCTION public.on_quest_approved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE 
  bal int;
BEGIN
  -- Only trigger on status change to approved
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    -- Verify approver is master_admin
    IF NOT actor_is_master_admin() THEN
      RAISE EXCEPTION 'Only master_admin can approve quests';
    END IF;
    
    -- Ensure approver has a wallet
    PERFORM public.ensure_wallet(auth.uid());
    
    -- Check if approver has sufficient balance
    SELECT balance INTO bal FROM public.coin_wallets WHERE user_id = auth.uid();
    IF bal < NEW.reward_coins THEN
      RAISE EXCEPTION 'Insufficient wallet balance to fund quest (% coins required, % available)', NEW.reward_coins, bal;
    END IF;
    
    -- Deduct coins from approver's wallet
    UPDATE public.coin_wallets 
    SET balance = balance - NEW.reward_coins, updated_at = now() 
    WHERE user_id = auth.uid();
    
    -- Record the transaction
    INSERT INTO public.coin_ledger (user_id, delta, kind, quest_id, created_by)
      VALUES (auth.uid(), -NEW.reward_coins, 'quest_budget', NEW.id, auth.uid());
    
    -- Set approval metadata
    NEW.approved_by := auth.uid();
    NEW.approved_at := now();
  END IF;
  
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_quest_approved ON public.quests;
CREATE TRIGGER trg_quest_approved
BEFORE UPDATE ON public.quests
FOR EACH ROW EXECUTE FUNCTION public.on_quest_approved();

-- 13) Submission reward trigger
CREATE OR REPLACE FUNCTION public.on_submission_reward()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE 
  reward int;
BEGIN
  -- Only trigger on status change to accepted or autograded
  IF (NEW.status IN ('accepted','autograded')) AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Get the reward amount from the approved quest
    SELECT q.reward_coins INTO reward 
    FROM public.quests q 
    WHERE q.id = NEW.quest_id AND q.status = 'approved';
    
    -- Only award if quest is approved and has reward
    IF reward IS NULL OR reward = 0 THEN 
      RETURN NEW; 
    END IF;
    
    -- Ensure student has a wallet
    PERFORM public.ensure_wallet(NEW.user_id);
    
    -- Credit student's wallet
    UPDATE public.coin_wallets 
    SET balance = balance + reward, updated_at = now() 
    WHERE user_id = NEW.user_id;
    
    -- Record the award transaction
    INSERT INTO public.coin_ledger (user_id, delta, kind, quest_id, created_by)
      VALUES (NEW.user_id, reward, 'quest_award', NEW.quest_id, auth.uid());
  END IF;
  
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_submission_reward ON public.quest_submissions;
CREATE TRIGGER trg_submission_reward
AFTER UPDATE ON public.quest_submissions
FOR EACH ROW EXECUTE FUNCTION public.on_submission_reward();

-- 14) Storage policies for quest video uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit) 
VALUES ('quest-uploads', 'quest-uploads', false, 52428800) -- 50MB limit
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload under their own user ID prefix
DROP POLICY IF EXISTS "storage: upload own videos" ON storage.objects;
CREATE POLICY "storage: upload own videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'quest-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own files; staff+ can read all
DROP POLICY IF EXISTS "storage: read own or staff+" ON storage.objects;
CREATE POLICY "storage: read own or staff+"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'quest-uploads'
  AND ( (storage.foldername(name))[1] = auth.uid()::text
        OR role_rank(actor_role()) >= role_rank('staff'::public.user_role) )
);