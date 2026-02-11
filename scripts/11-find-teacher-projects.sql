-- Find the teacher's actual projects
-- Teacher ID: 2bdb017b-3a56-4df0-9a08-c24de74b548b
-- Class ID: 2aabdf3a-086d-42f3-aa7d-bc7cb5e3d44c

-- 1. Check ALL projects in the database
SELECT id, title, class_id, teacher_id, created_at, updated_at
FROM projects
ORDER BY created_at DESC;

-- 2. Find projects by the teacher (should show "Mini Project" and "test")
SELECT id, title, class_id, teacher_id, created_at
FROM projects
WHERE teacher_id = '2bdb017b-3a56-4df0-9a08-c24de74b548b'
ORDER BY created_at DESC;

-- 3. Update the teacher's projects to the correct class
UPDATE projects
SET class_id = '2aabdf3a-086d-42f3-aa7d-bc7cb5e3d44c'
WHERE teacher_id = '2bdb017b-3a56-4df0-9a08-c24de74b548b'
  AND (class_id IS NULL OR class_id != '2aabdf3a-086d-42f3-aa7d-bc7cb5e3d44c');

-- 4. Verify the update
SELECT id, title, class_id, teacher_id
FROM projects
WHERE teacher_id = '2bdb017b-3a56-4df0-9a08-c24de74b548b';
