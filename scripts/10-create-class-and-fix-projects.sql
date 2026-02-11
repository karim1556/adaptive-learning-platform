-- Complete fix: Create class, assign projects, enroll student
-- Student ID: 58e96145-a948-4eae-ad46-a8bb299e43b9

-- Step 1: Check if any classes exist
SELECT COUNT(*) as class_count FROM classes;

-- Step 2: Get teacher ID from users table (find actual teachers)
SELECT id, email FROM auth.users WHERE raw_user_meta_data->>'role' = 'teacher' LIMIT 5;
-- OR if that doesn't work:
-- SELECT id FROM auth.users LIMIT 5;

-- Step 3: Create the class that the student thinks they joined
INSERT INTO classes (
  id,
  class_code,
  class_name,
  teacher_id,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'VU5YQQ',
  'SE B COMPS 2025',
  '2bdb017b-3a56-4df0-9a08-c24de74b548b',
  NOW(),
  NOW()
)
RETURNING id, class_code, class_name;

-- Step 4: Get the class ID we just created
SELECT id, class_code, class_name FROM classes WHERE class_code = 'VU5YQQ';

-- Step 5: See all projects (not just NULL class_id ones)
SELECT id, title, class_id, teacher_id, created_at 
FROM projects 
ORDER BY created_at DESC;

-- Step 6: Assign ALL projects to the class we created
UPDATE projects 
SET class_id = '2aabdf3a-086d-42f3-aa7d-bc7cb5e3d44c'
WHERE class_id IS NULL;

-- Step 7: Add student to the class
INSERT INTO class_students (
  id,
  class_id,
  student_id,
  enrolled_at,
  created_at
) VALUES (
  gen_random_uuid(),
  '2aabdf3a-086d-42f3-aa7d-bc7cb5e3d44c',
  '58e96145-a948-4eae-ad46-a8bb299e43b9',
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- Step 8: Verify everything is set up correctly
SELECT 
  'Classes' as table_name,
  COUNT(*) as count
FROM classes
UNION ALL
SELECT 
  'Projects with class_id',
  COUNT(*)
FROM projects
WHERE class_id IS NOT NULL
UNION ALL
SELECT 
  'Student enrollments',
  COUNT(*)
FROM class_students
WHERE student_id = '58e96145-a948-4eae-ad46-a8bb299e43b9';
