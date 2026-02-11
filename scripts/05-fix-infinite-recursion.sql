-- Fix infinite recursion in RLS policies
-- Run this in Supabase SQL Editor

-- First, drop ALL existing policies on class_students and projects
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on class_students
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'class_students') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON class_students';
    END LOOP;
    
    -- Drop all policies on projects
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'projects') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON projects';
    END LOOP;
END $$;

-- Create simple, non-recursive policies for class_students
CREATE POLICY "Students can read their enrollments" ON class_students
  FOR SELECT 
  USING (student_id = auth.uid());

CREATE POLICY "Students can insert their enrollments" ON class_students
  FOR INSERT 
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their enrollments" ON class_students
  FOR UPDATE 
  USING (student_id = auth.uid());

CREATE POLICY "Students can delete their enrollments" ON class_students
  FOR DELETE 
  USING (student_id = auth.uid());

CREATE POLICY "Teachers can view class students" ON class_students
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM classes 
      WHERE classes.class_code = class_students.class_code 
      AND classes.teacher_id = auth.uid()
    )
  );

-- Create simple policies for projects
CREATE POLICY "Teachers can manage projects" ON projects
  FOR ALL 
  USING (teacher_id = auth.uid());

CREATE POLICY "Students can view class projects" ON projects
  FOR SELECT 
  USING (
    -- Allow if no class assigned OR if student is in that class
    class_id IS NULL 
    OR 
    class_id IN (
      SELECT class_id 
      FROM class_students 
      WHERE student_id = auth.uid()
    )
  );

-- Verify policies were created
SELECT 
  tablename, 
  policyname, 
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies
WHERE tablename IN ('class_students', 'projects')
ORDER BY tablename, policyname;
