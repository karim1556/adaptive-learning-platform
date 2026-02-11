-- Quick verification script to check if adaptive practice data is ready
-- Run this to verify everything is set up correctly

-- 1. Check if mastery_records table has the new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'mastery_records'
ORDER BY ordinal_position;

-- 2. Count how many mastery records exist per student
SELECT 
  (u.first_name || ' ' || COALESCE(u.last_name, '')) AS full_name,
  u.email,
  COUNT(mr.id) as record_count,
  AVG(mr.mastery_score) as avg_mastery
FROM student_profiles sp
LEFT JOIN mastery_records mr ON mr.student_id = sp.id
LEFT JOIN users u ON sp.user_id = u.id
GROUP BY u.id, u.first_name, u.last_name, u.email
ORDER BY record_count DESC;

-- 3. Show sample mastery records with concept names
SELECT 
  (u.first_name || ' ' || COALESCE(u.last_name, '')) AS student_name,
  lc.name as concept_name,
  lc.category,
  mr.mastery_score,
  mr.checkpoints_passed,
  mr.total_checkpoints,
  mr.lessons_completed,
  mr.last_activity,
  CASE 
    WHEN mr.mastery_score < 30 THEN 'critical'
    WHEN mr.mastery_score < 50 THEN 'high'
    WHEN mr.mastery_score < 65 THEN 'medium'
    ELSE 'low'
  END as priority
FROM mastery_records mr
JOIN student_profiles sp ON sp.id = mr.student_id
JOIN users u ON sp.user_id = u.id
JOIN learning_concepts lc ON lc.id = mr.concept_id
ORDER BY mr.mastery_score ASC, u.first_name, u.last_name
LIMIT 20;

-- 4. Check if learning_concepts has data
SELECT 
  category,
  COUNT(*) as concept_count
FROM learning_concepts
GROUP BY category
ORDER BY concept_count DESC;

-- 5. For a specific student (replace with actual email), show their adaptive practice focus areas
-- Uncomment and modify this query:
/*
SELECT 
  lc.name as concept_name,
  lc.category,
  mr.mastery_score,
  mr.checkpoints_passed || '/' || mr.total_checkpoints as checkpoints,
  mr.lessons_completed || '/' || mr.total_lessons as lessons,
  mr.last_activity,
  CASE 
    WHEN mr.mastery_score < 30 THEN '🔴 CRITICAL'
    WHEN mr.mastery_score < 50 THEN '🟠 HIGH'
    WHEN mr.mastery_score < 65 THEN '🟡 MEDIUM'
    WHEN mr.mastery_score < 80 THEN '🟢 LOW'
    ELSE '✅ MASTERED'
  END as priority_status
FROM mastery_records mr
JOIN learning_concepts lc ON lc.id = mr.concept_id
WHERE mr.student_id = (
  SELECT sp.id FROM student_profiles sp
  JOIN users u ON sp.user_id = u.id
  WHERE u.email = 'student@example.com' LIMIT 1
)
ORDER BY 
  CASE 
    WHEN mr.mastery_score < 30 THEN 1
    WHEN mr.mastery_score < 50 THEN 2
    WHEN mr.mastery_score < 65 THEN 3
    WHEN mr.mastery_score < 80 THEN 4
    ELSE 5
  END,
  mr.mastery_score ASC;
*/
