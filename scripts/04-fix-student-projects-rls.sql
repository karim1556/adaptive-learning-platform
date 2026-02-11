-- Fix RLS policies for students to view their enrollments and projects
-- Run this in Supabase SQL Editor

-- Update Class Students Policies to allow students to read their enrollments
DROP POLICY IF EXISTS "Students can manage their enrollment" ON class_students;
DROP POLICY IF EXISTS "Students can view their own enrollment" ON class_students;
DROP POLICY IF EXISTS "Students can update their enrollment" ON class_students;
DROP POLICY IF EXISTS "Students can delete their enrollment" ON class_students;

-- Allow students to SELECT their own enrollments
CREATE POLICY "Students can view their own enrollment" ON class_students
  FOR SELECT USING (auth.uid() = student_id);

-- Allow students to INSERT their own enrollments
CREATE POLICY "Students can insert their enrollment" ON class_students
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Allow students to UPDATE their own enrollments
CREATE POLICY "Students can update their enrollment" ON class_students
  FOR UPDATE USING (auth.uid() = student_id);

-- Allow students to DELETE their own enrollments
CREATE POLICY "Students can delete their enrollment" ON class_students
  FOR DELETE USING (auth.uid() = student_id);

-- Update Projects Policy to ensure students can view projects from their classes
DROP POLICY IF EXISTS "Students can view projects for their classes" ON projects;
CREATE POLICY "Students can view projects for their classes" ON projects
  FOR SELECT USING (
    class_id IS NULL OR EXISTS (
      SELECT 1 FROM class_students 
      WHERE class_students.class_id = projects.class_id 
      AND class_students.student_id = auth.uid()
    )
  );

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('class_students', 'projects')
ORDER BY tablename, policyname;
