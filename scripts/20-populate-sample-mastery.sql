-- Populate sample mastery records for testing adaptive practice
-- This creates realistic weak areas for students to practice

-- First, let's check what students exist
-- Uncomment to see available students:
-- SELECT id, full_name, email FROM student_profiles LIMIT 10;

-- Then populate mastery records for a specific student
-- Replace 'YOUR_STUDENT_ID_HERE' with an actual student UUID

DO $$
DECLARE
  target_student_id UUID;
BEGIN
  -- Get the first student from your system (or specify a specific ID)
  SELECT id INTO target_student_id 
  FROM student_profiles 
  LIMIT 1;
  
  IF target_student_id IS NOT NULL THEN
    -- Insert mastery records with varied scores to create realistic gaps
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
      target_student_id,
      lc.id,
      -- Create varied mastery scores: some strong (80+), some weak (20-40), some medium (50-70)
      CASE 
        WHEN row_number() OVER (ORDER BY lc.name) % 5 = 0 THEN 25 + (random() * 15)::int  -- Critical (25-40)
        WHEN row_number() OVER (ORDER BY lc.name) % 5 = 1 THEN 40 + (random() * 15)::int  -- High priority (40-55)
        WHEN row_number() OVER (ORDER BY lc.name) % 5 = 2 THEN 55 + (random() * 15)::int  -- Medium priority (55-70)
        WHEN row_number() OVER (ORDER BY lc.name) % 5 = 3 THEN 70 + (random() * 10)::int  -- Low priority (70-80)
        ELSE 80 + (random() * 20)::int  -- Mastered (80-100)
      END as mastery_score,
      -- Checkpoints passed correlates with mastery
      CASE 
        WHEN (random() * 100) < 30 THEN 0
        WHEN (random() * 100) < 60 THEN 1
        WHEN (random() * 100) < 85 THEN 2
        ELSE 3
      END as checkpoints_passed,
      3 as total_checkpoints,
      -- Some lessons completed, some not
      CASE 
        WHEN (random() * 100) < 40 THEN 0
        ELSE 1
      END as lessons_completed,
      1 as total_lessons,
      NOW() - (random() * interval '14 days') as last_activity
    FROM learning_concepts lc
    LIMIT 15  -- Create 15 concepts to practice
    ON CONFLICT (student_id, concept_id) 
    DO UPDATE SET
      mastery_score = EXCLUDED.mastery_score,
      checkpoints_passed = EXCLUDED.checkpoints_passed,
      lessons_completed = EXCLUDED.lessons_completed,
      last_activity = EXCLUDED.last_activity;
    
    RAISE NOTICE 'Created mastery records for student: %', target_student_id;
  ELSE
    RAISE NOTICE 'No student found - please create a student profile first';
  END IF;
END $$;

-- Verify the data was created
SELECT 
  mr.mastery_score,
  lc.name as concept_name,
  lc.category,
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
JOIN learning_concepts lc ON lc.id = mr.concept_id
ORDER BY mr.mastery_score ASC
LIMIT 20;
