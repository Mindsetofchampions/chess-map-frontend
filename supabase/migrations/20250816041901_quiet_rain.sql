@@ .. @@
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
                 WHERE n.nspname='public' AND t.typname='quest_type') THEN
-    EXECUTE $$CREATE TYPE public.quest_type AS ENUM ('mcq','text','video');
+    EXECUTE $EXEC$CREATE TYPE public.quest_type AS ENUM ('mcq','text','video')$EXEC$;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
                 WHERE n.nspname='public' AND t.typname='quest_status') THEN
-    EXECUTE $$CREATE TYPE public.quest_status AS ENUM ('draft','submitted','approved','rejected','archived');
+    EXECUTE $EXEC$CREATE TYPE public.quest_status AS ENUM ('draft','submitted','approved','rejected','archived')$EXEC$;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
                 WHERE n.nspname='public' AND t.typname='submission_status') THEN
-    EXECUTE $$CREATE TYPE public.submission_status AS ENUM ('pending','accepted','rejected','autograded');
+    EXECUTE $EXEC$CREATE TYPE public.submission_status AS ENUM ('pending','accepted','rejected','autograded')$EXEC$;
  END IF;
END$$;