-- Debug script to check class data and student enrollment
-- Student ID: 58e96145-a948-4eae-ad46-a8bb299e43b9

-- 1. Check all classes and their IDs/codes
SELECT id, class_code, class_name, teacher_id, created_at 
FROM classes 
ORDER BY created_at DESC 
LIMIT 20;

-- 2. Check student enrollment in class_students
SELECT * 
FROM class_students 
WHERE student_id = '58e96145-a948-4eae-ad46-a8bb299e43b9';

-- 3. Check all projects and which class they're assigned to
SELECT id, title, class_id, teacher_id, created_at 
FROM projects 
ORDER BY created_at DESC 
LIMIT 20;

-- 4. Find class by code VU5YQQ
SELECT id, class_code, class_name, teacher_id 
FROM classes 
WHERE class_code ILIKE '%VU5YQQ%' OR class_name ILIKE '%VU5YQQ%';

-- 5. Alternative: Find any class with similar code pattern
SELECT id, class_code, class_name, teacher_id 
FROM classes 
WHERE class_code IS NOT NULL
LIMIT 50;
