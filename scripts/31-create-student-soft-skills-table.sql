-- Create table for student soft skills detected from uploaded achievements
-- This stores AI-analyzed soft skills from certificates, hackathon entries, etc.

CREATE TABLE IF NOT EXISTS student_soft_skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  skills TEXT[] NOT NULL, -- Array of soft skill names
  source TEXT, -- 'file' or 'description'
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE student_soft_skills ENABLE ROW LEVEL SECURITY;

-- Policies
-- Students can insert their own records
CREATE POLICY "Students can insert own soft skills"
  ON student_soft_skills
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM student_profiles WHERE id = student_soft_skills.student_id
    )
  );

-- Students can view their own records
CREATE POLICY "Students can view own soft skills"
  ON student_soft_skills
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM student_profiles WHERE id = student_soft_skills.student_id
    )
  );

-- Teachers can view soft skills of students in their classes
CREATE POLICY "Teachers can view student soft skills in their classes"
  ON student_soft_skills
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT tp.user_id 
      FROM teacher_profiles tp
      JOIN classes c ON c.teacher_id = tp.id
      JOIN class_students cs ON cs.class_id = c.id
      WHERE cs.student_id = student_soft_skills.student_id
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_student_soft_skills_student_id 
  ON student_soft_skills(student_id);

CREATE INDEX IF NOT EXISTS idx_student_soft_skills_uploaded_at 
  ON student_soft_skills(uploaded_at DESC);

-- Verify table creation
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'student_soft_skills'
ORDER BY ordinal_position;
