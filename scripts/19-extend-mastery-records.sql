-- Extend mastery_records table with additional tracking fields
-- This adds fields needed for the adaptive practice system

-- Add new columns to mastery_records
ALTER TABLE mastery_records
ADD COLUMN IF NOT EXISTS checkpoints_passed INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_checkpoints INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS lessons_completed INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_lessons INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP DEFAULT NOW();

-- Update existing records to have sensible defaults
UPDATE mastery_records
SET 
  checkpoints_passed = CASE 
    WHEN mastery_score >= 80 THEN 3
    WHEN mastery_score >= 50 THEN 2
    WHEN mastery_score >= 30 THEN 1
    ELSE 0
  END,
  total_checkpoints = 3,
  lessons_completed = CASE
    WHEN mastery_score >= 70 THEN 1
    ELSE 0
  END,
  total_lessons = 1,
  last_activity = COALESCE(last_updated, NOW())
WHERE checkpoints_passed IS NULL OR checkpoints_passed = 0;

-- Create an index on last_activity for efficient sorting
CREATE INDEX IF NOT EXISTS idx_mastery_records_last_activity ON mastery_records(last_activity DESC);

-- Insert sample mastery data for testing (using student IDs from your system)
-- You can customize these based on your actual student IDs

-- Example: Insert weak areas for a student to test adaptive practice
-- Replace 'STUDENT_ID_HERE' with an actual student UUID from your profiles table
-- 
-- INSERT INTO mastery_records (student_id, concept_id, mastery_score, checkpoints_passed, total_checkpoints, lessons_completed, total_lessons, last_activity)
-- SELECT 
--   'STUDENT_ID_HERE'::uuid,
--   id,
--   CASE 
--     WHEN name LIKE '%Linear%' THEN 25
--     WHEN name LIKE '%Quadratic%' THEN 45
--     WHEN name LIKE '%Algebra%' THEN 60
--     WHEN name LIKE '%Geometry%' THEN 75
--     ELSE 50
--   END as mastery_score,
--   CASE 
--     WHEN name LIKE '%Linear%' THEN 1
--     WHEN name LIKE '%Quadratic%' THEN 2
--     WHEN name LIKE '%Algebra%' THEN 2
--     WHEN name LIKE '%Geometry%' THEN 3
--     ELSE 2
--   END as checkpoints_passed,
--   3 as total_checkpoints,
--   CASE 
--     WHEN name LIKE '%Linear%' THEN 0
--     WHEN name LIKE '%Quadratic%' THEN 1
--     WHEN name LIKE '%Algebra%' THEN 1
--     WHEN name LIKE '%Geometry%' THEN 1
--     ELSE 1
--   END as lessons_completed,
--   1 as total_lessons,
--   NOW() - (random() * interval '7 days') as last_activity
-- FROM learning_concepts
-- LIMIT 10
-- ON CONFLICT (student_id, concept_id) DO UPDATE
-- SET 
--   mastery_score = EXCLUDED.mastery_score,
--   checkpoints_passed = EXCLUDED.checkpoints_passed,
--   total_checkpoints = EXCLUDED.total_checkpoints,
--   lessons_completed = EXCLUDED.lessons_completed,
--   total_lessons = EXCLUDED.total_lessons,
--   last_activity = EXCLUDED.last_activity;
