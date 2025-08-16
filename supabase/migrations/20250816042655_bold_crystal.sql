```diff
--- a/supabase/migrations/20250816042323_orange_recipe.sql
+++ b/supabase/migrations/20250816042323_orange_recipe.sql
@@ -56,27 +56,27 @@
 
 -- Policies for profiles table
 ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-CREATE POLICY IF NOT EXISTS "Profiles: admin update any" ON public.profiles
+CREATE POLICY "Profiles: admin update any" ON public.profiles
  FOR UPDATE TO public USING (actor_is_master_admin()) WITH CHECK (actor_is_master_admin());
-CREATE POLICY IF NOT EXISTS "Profiles: insert own row" ON public.profiles
+CREATE POLICY "Profiles: insert own row" ON public.profiles
  FOR INSERT TO public WITH CHECK (user_id = uid());
-CREATE POLICY IF NOT EXISTS "Profiles: update own row" ON public.profiles
+CREATE POLICY "Profiles: update own row" ON public.profiles
  FOR UPDATE TO public USING (user_id = uid()) WITH CHECK (user_id = uid());
-CREATE POLICY IF NOT EXISTS "profiles_self_or_admin" ON public.profiles
+CREATE POLICY "profiles_self_or_admin" ON public.profiles
  FOR SELECT TO authenticated USING (((user_id = uid()) OR (EXISTS ( SELECT 1
    FROM public.memberships am
   WHERE ((am.user_id = uid()) AND ((am.role = 'master_admin'::public.user_role) OR ((am.role = 'org_admin'::public.user_role) AND (am.org_id = profiles.org_id)))))));
 
 -- Policies for quest_evidence table
 ALTER TABLE public.quest_evidence ENABLE ROW LEVEL SECURITY;
-CREATE POLICY IF NOT EXISTS "qe_admin_read_all" ON public.quest_evidence
+CREATE POLICY "qe_admin_read_all" ON public.quest_evidence
  FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
    FROM public.users u
   WHERE ((u.id = uid()) AND (u.role = 'master_admin'::text)))) OR (EXISTS ( SELECT 1
    FROM public.memberships m
   WHERE ((m.user_id = uid()) AND (m.role = 'org_admin'::public.user_role)))));
-CREATE POLICY IF NOT EXISTS "qe_insert_self" ON public.quest_evidence
+CREATE POLICY "qe_insert_self" ON public.quest_evidence
  FOR INSERT TO authenticated WITH CHECK (user_id = uid());
-CREATE POLICY IF NOT EXISTS "qe_select_self" ON public.quest_evidence
+CREATE POLICY "qe_select_self" ON public.quest_evidence
  FOR SELECT TO authenticated USING (user_id = uid());
-CREATE POLICY IF NOT EXISTS "quest_evidence_admin_read" ON public.quest_evidence
+CREATE POLICY "quest_evidence_admin_read" ON public.quest_evidence
  FOR SELECT TO public USING (EXISTS ( SELECT 1
    FROM public.memberships m
   WHERE ((m.user_id = uid()) AND ((m.role = 'org_admin'::public.user_role) OR (m.role = 'master_admin'::public.user_role)))));
-CREATE POLICY IF NOT EXISTS "quest_evidence_owner_rw" ON public.quest_evidence
+CREATE POLICY "quest_evidence_owner_rw" ON public.quest_evidence
  FOR ALL TO public USING (uid() = user_id) WITH CHECK (uid() = user_id);
 
 -- Policies for allowlisted_domains table
```