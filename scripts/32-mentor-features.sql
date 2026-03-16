-- Mentor feature support tables for AMEP
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS module_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  concept_id VARCHAR(255),
  concept_name VARCHAR(255) NOT NULL,
  learning_mode VARCHAR(50),
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS student_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_key VARCHAR(100) NOT NULL,
  badge_name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(student_id, badge_key)
);

CREATE TABLE IF NOT EXISTS parent_progress_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_email VARCHAR(255) NOT NULL,
  parent_name VARCHAR(255),
  delivery_status VARCHAR(50) DEFAULT 'drafted',
  subject VARCHAR(255),
  snapshot JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE module_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_progress_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can insert own module feedback" ON module_feedback;
CREATE POLICY "Students can insert own module feedback" ON module_feedback
  FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can update own module feedback" ON module_feedback;
CREATE POLICY "Students can update own module feedback" ON module_feedback
  FOR UPDATE USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can read own module feedback" ON module_feedback;
CREATE POLICY "Students can read own module feedback" ON module_feedback
  FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Teachers can read module feedback for their lessons" ON module_feedback;
CREATE POLICY "Teachers can read module feedback for their lessons" ON module_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM lessons
      WHERE lessons.id = module_feedback.lesson_id
      AND lessons.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can manage own badges" ON student_badges;
CREATE POLICY "Students can manage own badges" ON student_badges
  FOR ALL USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can insert own progress shares" ON parent_progress_shares;
CREATE POLICY "Students can insert own progress shares" ON parent_progress_shares
  FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can read own progress shares" ON parent_progress_shares;
CREATE POLICY "Students can read own progress shares" ON parent_progress_shares
  FOR SELECT USING (auth.uid() = student_id);

CREATE INDEX IF NOT EXISTS idx_module_feedback_lesson_id ON module_feedback(lesson_id);
CREATE INDEX IF NOT EXISTS idx_module_feedback_concept_name ON module_feedback(concept_name);
CREATE INDEX IF NOT EXISTS idx_student_badges_student_id ON student_badges(student_id);
CREATE INDEX IF NOT EXISTS idx_parent_progress_shares_student_id ON parent_progress_shares(student_id);
