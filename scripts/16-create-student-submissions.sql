-- Create student_project_submissions table for individual student submissions

CREATE TABLE IF NOT EXISTS student_project_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  content TEXT NOT NULL,
  file_url TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  feedback TEXT,
  grade INTEGER,
  UNIQUE(project_id, student_id)
);

-- Disable RLS
ALTER TABLE student_project_submissions DISABLE ROW LEVEL SECURITY;

-- Verify it was created
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'student_project_submissions'
ORDER BY ordinal_position;
