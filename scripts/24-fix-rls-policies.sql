-- FIX RLS POLICIES: Enable RLS with correct policies (no NEW references)
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Enable RLS and add policies for student_profiles
-- ============================================================================
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Students can select own profile" ON student_profiles;
DROP POLICY IF EXISTS "Students can insert own profile" ON student_profiles;
DROP POLICY IF EXISTS "Students can update own profile" ON student_profiles;

-- SELECT: users can read their own profile
CREATE POLICY "Students can select own profile" ON student_profiles
  FOR SELECT USING (user_id = auth.uid());

-- INSERT: users can create their own profile
CREATE POLICY "Students can insert own profile" ON student_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- UPDATE: users can update their own profile
CREATE POLICY "Students can update own profile" ON student_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================================================
-- STEP 2: Enable RLS and add policies for mastery_records
-- ============================================================================
ALTER TABLE mastery_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Students can select own mastery" ON mastery_records;
DROP POLICY IF EXISTS "Students can insert own mastery" ON mastery_records;
DROP POLICY IF EXISTS "Students can update own mastery" ON mastery_records;

-- SELECT: students can read mastery rows belonging to their student_profile
CREATE POLICY "Students can select own mastery" ON mastery_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = mastery_records.student_id
        AND sp.user_id = auth.uid()
    )
  );

-- INSERT: students can create mastery records for their profile
-- NOTE: Use column name directly, NOT NEW.student_id
CREATE POLICY "Students can insert own mastery" ON mastery_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = student_id
        AND sp.user_id = auth.uid()
    )
  );

-- UPDATE: students can update their own mastery records
CREATE POLICY "Students can update own mastery" ON mastery_records
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = mastery_records.student_id
        AND sp.user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 3: Enable RLS for learning_concepts (public read)
-- ============================================================================
ALTER TABLE learning_concepts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select learning_concepts" ON learning_concepts;

-- Public read access (concepts are not user-sensitive)
CREATE POLICY "Public select learning_concepts" ON learning_concepts
  FOR SELECT USING (true);

-- ============================================================================
-- STEP 4: Verify policies are active
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('student_profiles', 'mastery_records', 'learning_concepts')
ORDER BY tablename, policyname;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
SELECT '✅ RLS policies successfully applied!' as status;
