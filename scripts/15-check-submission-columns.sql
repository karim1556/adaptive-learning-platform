-- Check actual column names in project_submissions
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'project_submissions'
ORDER BY ordinal_position;

-- Check all data
SELECT * FROM project_submissions LIMIT 5;
