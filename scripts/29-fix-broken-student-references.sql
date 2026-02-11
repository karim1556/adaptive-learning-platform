-- Fix broken student references in class_students, attendance, and student_marks
-- This script ensures all student_ids reference valid student_profiles

BEGIN;

-- Step 1: Find all student_ids from class_students that don't have profiles
WITH missing_profiles AS (
  SELECT DISTINCT cs.student_id
  FROM class_students cs
  LEFT JOIN student_profiles sp ON sp.user_id = cs.student_id
  WHERE sp.id IS NULL
)
-- Create placeholder users for these IDs
INSERT INTO users (id, email, password_hash, role, first_name, last_name)
SELECT 
  mp.student_id,
  'student_' || SUBSTRING(mp.student_id::text, 1, 8) || '@placeholder.local',
  'PLACEHOLDER_NO_LOGIN',
  'student',
  'Student',
  SUBSTRING(mp.student_id::text, 1, 8)
FROM missing_profiles mp
ON CONFLICT (id) DO NOTHING;

-- Step 2: Create student_profiles for all users that don't have them
INSERT INTO student_profiles (user_id, enrollment_date, overall_mastery_score, engagement_index)
SELECT 
  mp.student_id,
  NOW(),
  0,
  50
FROM (
  SELECT DISTINCT cs.student_id
  FROM class_students cs
  LEFT JOIN student_profiles sp ON sp.user_id = cs.student_id
  WHERE sp.id IS NULL
) mp
ON CONFLICT (user_id) DO NOTHING;

-- Step 3: Create a function to auto-create profiles when students are added to classes
CREATE OR REPLACE FUNCTION ensure_student_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user exists in users table
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.student_id) THEN
    -- Create placeholder user
    INSERT INTO users (id, email, password_hash, role, first_name, last_name)
    VALUES (
      NEW.student_id,
      'student_' || SUBSTRING(NEW.student_id::text, 1, 8) || '@placeholder.local',
      'PLACEHOLDER_NO_LOGIN',
      'student',
      COALESCE(SPLIT_PART(NEW.name, ' ', 1), 'Student'),
      COALESCE(SPLIT_PART(NEW.name, ' ', 2), SUBSTRING(NEW.student_id::text, 1, 8))
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Check if student_profile exists
  IF NOT EXISTS (SELECT 1 FROM student_profiles WHERE user_id = NEW.student_id) THEN
    -- Create student_profile
    INSERT INTO student_profiles (user_id, enrollment_date, overall_mastery_score, engagement_index)
    VALUES (NEW.student_id, NOW(), 0, 50)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger on class_students
DROP TRIGGER IF EXISTS ensure_student_profile_trigger ON class_students;
CREATE TRIGGER ensure_student_profile_trigger
  BEFORE INSERT ON class_students
  FOR EACH ROW
  EXECUTE FUNCTION ensure_student_profile();

-- Step 5: Fix broken attendance records
-- Delete attendance records that reference non-existent student_profiles
DELETE FROM attendance a
WHERE NOT EXISTS (
  SELECT 1 FROM student_profiles sp WHERE sp.id = a.student_id
);

-- Step 6: Fix broken marks records  
-- Delete marks records that reference non-existent student_profiles
DELETE FROM student_marks sm
WHERE NOT EXISTS (
  SELECT 1 FROM student_profiles sp WHERE sp.id = sm.student_id
);

-- Step 7: Add constraints to prevent future issues (if not already present)
DO $$
BEGIN
  -- Add FK constraint on attendance if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'attendance_student_id_fkey' 
    AND table_name = 'attendance'
  ) THEN
    ALTER TABLE attendance
    ADD CONSTRAINT attendance_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE;
  END IF;

  -- Add FK constraint on student_marks if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'student_marks_student_id_fkey' 
    AND table_name = 'student_marks'
  ) THEN
    ALTER TABLE student_marks
    ADD CONSTRAINT student_marks_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

COMMIT;

-- Verification queries
SELECT 'Students in class_students without profiles:' as check_name, COUNT(*) as count
FROM class_students cs
LEFT JOIN student_profiles sp ON sp.user_id = cs.student_id
WHERE sp.id IS NULL;

SELECT 'Attendance records without valid student_profiles:' as check_name, COUNT(*) as count
FROM attendance a
LEFT JOIN student_profiles sp ON sp.id = a.student_id
WHERE sp.id IS NULL;

SELECT 'Marks records without valid student_profiles:' as check_name, COUNT(*) as count
FROM student_marks sm
LEFT JOIN student_profiles sp ON sp.id = sm.student_id
WHERE sp.id IS NULL;

SELECT 'Total student_profiles created:' as check_name, COUNT(*) as count FROM student_profiles;
SELECT 'Total users with student role:' as check_name, COUNT(*) as count FROM users WHERE role = 'student';
