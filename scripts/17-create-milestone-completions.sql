-- Create project_milestone_completions table for tracking individual student milestone completion

CREATE TABLE IF NOT EXISTS project_milestone_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_id UUID NOT NULL REFERENCES project_milestones(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, milestone_id, student_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_milestone_completions_project_student 
  ON project_milestone_completions(project_id, student_id);

CREATE INDEX IF NOT EXISTS idx_milestone_completions_milestone 
  ON project_milestone_completions(milestone_id);

-- Disable RLS for now
ALTER TABLE project_milestone_completions DISABLE ROW LEVEL SECURITY;

-- Verify table was created
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'project_milestone_completions'
ORDER BY ordinal_position;
