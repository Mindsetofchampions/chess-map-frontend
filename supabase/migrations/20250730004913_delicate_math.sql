/*
  # Add RLS policy for analytics logs

  1. Security
    - Add policy for authenticated users to insert their own analytics logs
    - This allows students and other authenticated users to log their interactions
    - Users can only insert logs with their own user_id
*/

CREATE POLICY "Allow users to insert own analytics logs"
  ON analytics_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());