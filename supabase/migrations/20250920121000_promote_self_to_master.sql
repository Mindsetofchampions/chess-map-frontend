-- Migration neutralized on 2025-09-20 to unblock normalization migration
-- Purpose: original file had broken SQL assumptions; replaced with no-op
-- This file intentionally does nothing.

DO $do$
BEGIN
	-- no-op
END
$do$;
