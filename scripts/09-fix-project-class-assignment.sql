-- Fix project class assignment issue
-- Projects are showing class_id = NULL

-- 1. First, let's see what classes exist (RUN THIS FIRST!)
SELECT id, class_code, class_name, teacher_id 
FROM classes
ORDER BY created_at DESC;

-- 2. Check the projects - which ones have NULL class_id?
SELECT id, title, class_id, teacher_id, created_at 
FROM projects 
WHERE class_id IS NULL;

-- 3. Update projects to assign them to a class
-- Replace 'YOUR_CLASS_ID_HERE' with the actual class ID from step 1
-- Example: If class_code = 'VU5YQQ' has id = 'abc123...', use that

-- UPDATE projects 
-- SET class_id = 'YOUR_CLASS_ID_HERE'
-- WHERE class_id IS NULL;

-- 4. Verify the update worked
-- SELECT id, title, class_id, teacher_id 
-- FROM projects;
