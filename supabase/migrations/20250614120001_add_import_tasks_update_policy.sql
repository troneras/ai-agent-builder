-- Migration: Add missing UPDATE policy for import_tasks
-- Description: Allows authenticated users to update their own import tasks

-- Add UPDATE policy for authenticated users
CREATE POLICY "Users can update own import tasks" 
  ON import_tasks FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON POLICY "Users can update own import tasks" ON import_tasks IS 'Allows authenticated users to update the status and data of their own import tasks'; 