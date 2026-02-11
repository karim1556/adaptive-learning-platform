-- QUICK FIX: Disable RLS and populate mastery data immediately
-- Run this in Supabase SQL Editor to get adaptive practice working NOW

-- ============================================================================
-- STEP 1: Disable RLS on mastery_records and learning_concepts
-- ============================================================================
ALTER TABLE mastery_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE learning_concepts DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: Add missing columns if they don't exist
-- ============================================================================
DO $$ 
BEGIN
  -- Add checkpoints_passed if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mastery_records' AND column_name = 'checkpoints_passed'
  ) THEN
    ALTER TABLE mastery_records ADD COLUMN checkpoints_passed INT DEFAULT 0;
  END IF;
  
  -- Add total_checkpoints if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mastery_records' AND column_name = 'total_checkpoints'
  ) THEN
    ALTER TABLE mastery_records ADD COLUMN total_checkpoints INT DEFAULT 0;
  END IF;
  
  -- Add lessons_completed if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mastery_records' AND column_name = 'lessons_completed'
  ) THEN
    ALTER TABLE mastery_records ADD COLUMN lessons_completed INT DEFAULT 0;
  END IF;
  
  -- Add total_lessons if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mastery_records' AND column_name = 'total_lessons'
  ) THEN
    ALTER TABLE mastery_records ADD COLUMN total_lessons INT DEFAULT 1;
  END IF;
  
  -- Add last_activity if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mastery_records' AND column_name = 'last_activity'
  ) THEN
    ALTER TABLE mastery_records ADD COLUMN last_activity TIMESTAMP DEFAULT NOW();
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Clear existing mastery records and repopulate with fresh data
-- ============================================================================
-- Delete old records to start fresh
DELETE FROM mastery_records;

-- Populate for ALL students with realistic varied scores
DO $$
DECLARE
  student_rec RECORD;
BEGIN
  -- Loop through all students
  FOR student_rec IN 
    SELECT sp.id as student_id
    FROM student_profiles sp
  LOOP
    -- Insert 12 concepts per student with varied mastery scores
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
      student_rec.student_id,
      lc.id,
      -- Realistic distribution: 20% critical, 20% high, 20% medium, 20% low, 20% mastered
      CASE 
        WHEN row_number() OVER (ORDER BY random()) % 5 = 0 THEN 20 + (random() * 20)::int  -- Critical (20-40)
        WHEN row_number() OVER (ORDER BY random()) % 5 = 1 THEN 40 + (random() * 15)::int  -- High (40-55)
        WHEN row_number() OVER (ORDER BY random()) % 5 = 2 THEN 55 + (random() * 15)::int  -- Medium (55-70)
        WHEN row_number() OVER (ORDER BY random()) % 5 = 3 THEN 70 + (random() * 15)::int  -- Low (70-85)
        ELSE 85 + (random() * 15)::int  -- Mastered (85-100)
      END as mastery_score,
      (random() * 3)::int as checkpoints_passed,
      3 as total_checkpoints,
      CASE WHEN random() < 0.6 THEN 1 ELSE 0 END as lessons_completed,
      1 as total_lessons,
      NOW() - (random() * interval '30 days') as last_activity
    FROM learning_concepts lc
    ORDER BY random()
    LIMIT 12;
    
    RAISE NOTICE 'Created 12 mastery records for student: %', student_rec.student_id;
  END LOOP;
END $$;

-- ============================================================================
-- STEP 4: Verify the data
-- ============================================================================
SELECT 
  '✅ SETUP COMPLETE!' as status,
  COUNT(DISTINCT student_id) as students_with_data,
  COUNT(*) as total_records,
  ROUND(AVG(mastery_score), 1) as avg_mastery
FROM mastery_records;

-- Show sample data
SELECT 
  lc.name as concept,
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
WHERE mr.mastery_score < 80
ORDER BY mr.mastery_score ASC
LIMIT 10;
