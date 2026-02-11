-- COMPREHENSIVE SETUP FOR ADAPTIVE PRACTICE
-- Run this script in Supabase SQL Editor to set up adaptive practice completely

-- ============================================================================
-- STEP 1: Extend mastery_records table
-- ============================================================================
ALTER TABLE mastery_records
ADD COLUMN IF NOT EXISTS checkpoints_passed INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_checkpoints INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS lessons_completed INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_lessons INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_mastery_records_last_activity 
ON mastery_records(last_activity DESC);

-- Update existing records
UPDATE mastery_records
SET 
  checkpoints_passed = CASE 
    WHEN mastery_score >= 80 THEN 3
    WHEN mastery_score >= 50 THEN 2
    WHEN mastery_score >= 30 THEN 1
    ELSE 0
  END,
  total_checkpoints = 3,
  lessons_completed = CASE WHEN mastery_score >= 70 THEN 1 ELSE 0 END,
  total_lessons = 1,
  last_activity = COALESCE(last_updated, NOW())
WHERE checkpoints_passed IS NULL OR checkpoints_passed = 0;

-- ============================================================================
-- STEP 2: Populate sample data for ALL students
-- ============================================================================
DO $$
DECLARE
  student_record RECORD;
  concept_record RECORD;
  mastery_val INT;
  checkpoints_val INT;
  lessons_val INT;
BEGIN
  -- Loop through all students (join to users for names)
  FOR student_record IN 
    SELECT sp.id as id, u.first_name as first_name, u.last_name as last_name
    FROM student_profiles sp
    JOIN users u ON sp.user_id = u.id
  LOOP
    RAISE NOTICE 'Creating mastery records for student: % (%)', (student_record.first_name || ' ' || COALESCE(student_record.last_name, '')), student_record.id;
    
    -- Create 10-15 mastery records per student with varied scores
    INSERT INTO mastery_records (
      student_id, 
      concept_id, 
      mastery_score, 
      checkpoints_passed, 
      total_checkpoints, 
      lessons_completed, 
      total_lessons, 
      last_activity
    )
    SELECT 
      student_record.id,
      lc.id,
      -- Create realistic distribution of mastery scores
      CASE 
        WHEN row_number() OVER (ORDER BY random()) % 5 = 0 THEN 20 + (random() * 20)::int  -- Critical (20-40)
        WHEN row_number() OVER (ORDER BY random()) % 5 = 1 THEN 40 + (random() * 15)::int  -- High (40-55)
        WHEN row_number() OVER (ORDER BY random()) % 5 = 2 THEN 55 + (random() * 15)::int  -- Medium (55-70)
        WHEN row_number() OVER (ORDER BY random()) % 5 = 3 THEN 70 + (random() * 15)::int  -- Low (70-85)
        ELSE 85 + (random() * 15)::int  -- Mastered (85-100)
      END as mastery_score,
      -- Checkpoints correlate with mastery
      (random() * 3)::int as checkpoints_passed,
      3 as total_checkpoints,
      CASE WHEN random() < 0.6 THEN 1 ELSE 0 END as lessons_completed,
      1 as total_lessons,
      NOW() - (random() * interval '30 days') as last_activity
    FROM learning_concepts lc
    ORDER BY random()
    LIMIT 12  -- 12 concepts per student
    ON CONFLICT (student_id, concept_id) 
    DO UPDATE SET
      mastery_score = EXCLUDED.mastery_score,
      checkpoints_passed = EXCLUDED.checkpoints_passed,
      lessons_completed = EXCLUDED.lessons_completed,
      last_activity = EXCLUDED.last_activity;
  END LOOP;
END $$;

-- ============================================================================
-- STEP 3: Verify the setup
-- ============================================================================
SELECT 
  '✅ SETUP COMPLETE' as status,
  COUNT(DISTINCT mr.student_id) as students_with_data,
  COUNT(mr.id) as total_mastery_records,
  ROUND(AVG(mr.mastery_score), 2) as avg_mastery_score
FROM mastery_records mr;

-- Show sample data per student
SELECT 
  (u.first_name || ' ' || COALESCE(u.last_name, '')) as student,
  COUNT(mr.id) as concepts_tracked,
  ROUND(AVG(mr.mastery_score), 1) as avg_mastery,
  COUNT(CASE WHEN mr.mastery_score < 30 THEN 1 END) as critical_concepts,
  COUNT(CASE WHEN mr.mastery_score < 50 THEN 1 END) as high_priority_concepts,
  COUNT(CASE WHEN mr.mastery_score >= 80 THEN 1 END) as mastered_concepts
FROM student_profiles sp
LEFT JOIN mastery_records mr ON mr.student_id = sp.id
LEFT JOIN users u ON sp.user_id = u.id
GROUP BY sp.id, u.first_name, u.last_name
ORDER BY concepts_tracked DESC;

-- Show concept gaps for verification
SELECT 
  lc.name as concept,
  lc.category,
  mr.mastery_score,
  CASE 
    WHEN mr.mastery_score < 30 THEN '🔴 CRITICAL'
    WHEN mr.mastery_score < 50 THEN '🟠 HIGH'
    WHEN mr.mastery_score < 65 THEN '🟡 MEDIUM'
    WHEN mr.mastery_score < 80 THEN '🟢 LOW'
    ELSE '✅ MASTERED'
  END as priority
FROM mastery_records mr
JOIN learning_concepts lc ON lc.id = mr.concept_id
WHERE mr.mastery_score < 80  -- Only show gaps
ORDER BY mr.mastery_score ASC
LIMIT 15;
