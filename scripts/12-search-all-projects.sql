-- Find all projects with any title containing "Mini" or "test"
SELECT id, title, class_id, teacher_id, created_at
FROM projects
WHERE title ILIKE '%Mini%' 
   OR title ILIKE '%test%'
ORDER BY created_at DESC;

-- Check if there are any projects besides the seed data
SELECT COUNT(*) as total_projects FROM projects;

-- See all project titles
SELECT title, teacher_id, created_at 
FROM projects 
ORDER BY created_at DESC 
LIMIT 20;
