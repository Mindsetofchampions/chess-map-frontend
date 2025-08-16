/*
  # Fix infinite recursion in RLS policies

  1. Problem
    - The `memberships` table SELECT policy references itself, causing infinite recursion
    - This happens when the policy checks memberships from within a memberships query

  2. Solution
    - Replace the circular reference with direct function calls
    - Use `actor_is_master_admin()` and role-based functions to avoid recursion
    - Maintain the same business logic without circular dependencies

  3. Changes
    - Drop and recreate the problematic `memberships_self_or_admin` policy
    - Use database functions instead of recursive table lookups
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "memberships_self_or_admin" ON memberships;

-- Recreate the policy without circular reference
-- Users can see their own memberships OR if they are master admin
CREATE POLICY "memberships_self_or_admin" 
  ON memberships 
  FOR SELECT 
  TO authenticated 
  USING (
    user_id = uid() OR 
    actor_is_master_admin()
  );