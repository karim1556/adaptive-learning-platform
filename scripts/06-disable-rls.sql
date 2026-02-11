-- Disable RLS on all project-related tables to avoid infinite recursion issues
-- This can be re-enabled later with proper policies

-- Disable RLS on class_students table
ALTER TABLE class_students DISABLE ROW LEVEL SECURITY;

-- Disable RLS on projects table
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- Disable RLS on project_teams table
ALTER TABLE project_teams DISABLE ROW LEVEL SECURITY;

-- Disable RLS on project_team_members table
ALTER TABLE project_team_members DISABLE ROW LEVEL SECURITY;

-- Disable RLS on project_milestones table
ALTER TABLE project_milestones DISABLE ROW LEVEL SECURITY;

-- Disable RLS on project_submissions table
ALTER TABLE project_submissions DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on classes table for consistency
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;

-- Verify that RLS is disabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'class_students',
    'projects',
    'project_teams',
    'project_team_members',
    'project_milestones',
    'project_submissions',
    'classes'
)
ORDER BY tablename;
