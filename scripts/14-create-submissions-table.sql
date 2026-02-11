-- Create project_submissions table if it doesn't exist

-- 1. Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'project_submissions';

-- 2. Create the table
CREATE TABLE IF NOT EXISTS project_submissions (
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

-- 3. Verify table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'project_submissions'
ORDER BY ordinal_position;

-- 4. Check if RLS is enabled (should be disabled)
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'project_submissions';

-- 5. Disable RLS if enabled
ALTER TABLE project_submissions DISABLE ROW LEVEL SECURITY;
