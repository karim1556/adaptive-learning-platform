-- Check if the student is actually enrolled in any classes
-- Student ID: 58e96145-a948-4eae-ad46-a8bb299e43b9

-- 1. First, check the structure of classes table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'classes'
ORDER BY ordinal_position;

-- 2. Check all classes available (to see column names)
SELECT * FROM classes LIMIT 5;

-- 3. Check class_students table for this student
SELECT * FROM class_students
WHERE student_id = '58e96145-a948-4eae-ad46-a8bb299e43b9';

-- 4. Check all class_students records (to see if table has data)
SELECT * FROM class_students LIMIT 10;

-- 5. Check if there are any projects
SELECT * FROM projects LIMIT 10;

-- 6. Check the structure of class_students table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'class_students'
ORDER BY ordinal_position;
