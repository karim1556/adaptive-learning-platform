-- Fix teacher profile missing issue
-- Teacher ID: 2bdb017b-3a56-4df0-9a08-c24de74b548b

-- 1. Check if teacher_profiles table exists and what columns it has
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'teacher_profiles';

-- 2. Check if this teacher has a profile
SELECT * FROM teacher_profiles WHERE id = '2bdb017b-3a56-4df0-9a08-c24de74b548b';

-- 3. Create teacher profile
INSERT INTO teacher_profiles (
  id,
  user_id,
  created_at,
  updated_at
) VALUES (
  '2bdb017b-3a56-4df0-9a08-c24de74b548b',
  '2bdb017b-3a56-4df0-9a08-c24de74b548b',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 4. Verify it was created
SELECT * FROM teacher_profiles WHERE id = '2bdb017b-3a56-4df0-9a08-c24de74b548b';

-- 5. Drop the foreign key constraint - allows projects without requiring teacher_profiles
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_teacher_id_fkey;

-- 6. Verify constraint is gone
SELECT conname 
FROM pg_constraint 
WHERE conrelid = 'projects'::regclass 
  AND conname = 'projects_teacher_id_fkey';
