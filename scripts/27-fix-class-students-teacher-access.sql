-- Fix: Allow teachers to view their class students
-- This enables the diary page to load students

DO $$ 
BEGIN
  -- Drop existing teacher policies if they exist
  DROP POLICY IF EXISTS "Teachers can view their class students" ON class_students;
  
  -- Create policy for teachers to view students in their classes
  CREATE POLICY "Teachers can view their class students" ON class_students
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes 
      WHERE classes.id = class_students.class_id 
      AND classes.teacher_id = auth.uid()
    )
  );
  
  RAISE NOTICE 'Teacher access policy created for class_students';
END $$;

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'class_students';

-- Show all policies on class_students
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'class_students';
