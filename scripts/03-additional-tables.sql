-- AdaptIQ Additional Tables
-- Tables needed for the app to work with Supabase
-- Run this in Supabase SQL Editor

-- =============================================================================
-- STEP 1: CREATE ALL TABLES FIRST
-- =============================================================================

-- PROFILES TABLE (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  full_name VARCHAR(255),
  role VARCHAR(50) CHECK (role IN ('student', 'teacher', 'parent', 'admin')),
  overall_mastery DECIMAL(5, 2) DEFAULT 0,
  engagement_index DECIMAL(5, 2) DEFAULT 50,
  department VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CLASSES TABLE
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_code VARCHAR(10) UNIQUE NOT NULL,
  class_name VARCHAR(255) NOT NULL,
  subject VARCHAR(100),
  grade VARCHAR(50),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CLASS STUDENTS TABLE (enrollment)
CREATE TABLE IF NOT EXISTS class_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  class_code VARCHAR(10) NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255),
  email VARCHAR(255),
  roll_number VARCHAR(50),
  dominant_styles VARCHAR(50)[],
  mastery_average DECIMAL(5, 2) DEFAULT 0,
  engagement_level DECIMAL(5, 2) DEFAULT 50,
  last_active TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(class_code, student_id)
);

-- LESSONS TABLE
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  class_code VARCHAR(10),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject VARCHAR(100),
  grade VARCHAR(50),
  difficulty VARCHAR(50) DEFAULT 'beginner',
  estimated_time INTEGER DEFAULT 30,
  learning_objectives TEXT[],
  published BOOLEAN DEFAULT FALSE,
  blocks JSONB DEFAULT '[]'::jsonb,
  checkpoints JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LESSON PROGRESS TABLE
CREATE TABLE IF NOT EXISTS lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  current_block_index INTEGER DEFAULT 0,
  completed_blocks INTEGER[] DEFAULT '{}',
  checkpoint_scores JSONB DEFAULT '{}'::jsonb,
  overall_score DECIMAL(5, 2) DEFAULT 0,
  time_spent INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(lesson_id, student_id)
);

-- =============================================================================
-- STEP 2: ENABLE ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 3: CREATE RLS POLICIES
-- =============================================================================

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Classes Policies
DROP POLICY IF EXISTS "Teachers can manage their classes" ON classes;
CREATE POLICY "Teachers can manage their classes" ON classes
  FOR ALL USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Students can view classes" ON classes;
CREATE POLICY "Students can view classes" ON classes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_students 
      WHERE class_students.class_code = classes.class_code 
      AND class_students.student_id = auth.uid()
    )
  );

-- Class Students Policies
DROP POLICY IF EXISTS "Teachers can view their class students" ON class_students;
CREATE POLICY "Teachers can view their class students" ON class_students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classes 
      WHERE classes.class_code = class_students.class_code 
      AND classes.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can view their own enrollment" ON class_students;
CREATE POLICY "Students can view their own enrollment" ON class_students
  FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can manage their enrollment" ON class_students;
CREATE POLICY "Students can manage their enrollment" ON class_students
  FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can update their enrollment" ON class_students;
CREATE POLICY "Students can update their enrollment" ON class_students
  FOR UPDATE USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can delete their enrollment" ON class_students;
CREATE POLICY "Students can delete their enrollment" ON class_students
  FOR DELETE USING (auth.uid() = student_id);

-- Lessons Policies
DROP POLICY IF EXISTS "Teachers can manage their lessons" ON lessons;
CREATE POLICY "Teachers can manage their lessons" ON lessons
  FOR ALL USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Students can view published lessons" ON lessons;
CREATE POLICY "Students can view published lessons" ON lessons
  FOR SELECT USING (published = true);

-- Lesson Progress Policies
DROP POLICY IF EXISTS "Students can manage their progress" ON lesson_progress;
CREATE POLICY "Students can manage their progress" ON lesson_progress
  FOR ALL USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Teachers can view student progress" ON lesson_progress;
CREATE POLICY "Teachers can view student progress" ON lesson_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons 
      WHERE lessons.id = lesson_progress.lesson_id 
      AND lessons.teacher_id = auth.uid()
    )
  );

-- =============================================================================
-- STEP 4: CREATE INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_class_code ON classes(class_code);
CREATE INDEX IF NOT EXISTS idx_class_students_class_code ON class_students(class_code);
CREATE INDEX IF NOT EXISTS idx_class_students_student_id ON class_students(student_id);
CREATE INDEX IF NOT EXISTS idx_lessons_teacher_id ON lessons(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lessons_class_id ON lessons(class_id);
CREATE INDEX IF NOT EXISTS idx_lessons_published ON lessons(published);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_student_id ON lesson_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id ON lesson_progress(lesson_id);

-- =============================================================================
-- STEP 5: CREATE PROJECT TABLES
-- =============================================================================

-- PROJECTS TABLE (Project-Based Learning)
-- First create the table if it doesn't exist (with minimal columns)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id VARCHAR(255),
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add class_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='projects' AND column_name='class_id') THEN
    ALTER TABLE projects ADD COLUMN class_id UUID REFERENCES classes(id) ON DELETE SET NULL;
  END IF;

  -- Add difficulty column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='projects' AND column_name='difficulty') THEN
    ALTER TABLE projects ADD COLUMN difficulty VARCHAR(50) CHECK (difficulty IN ('Easy', 'Medium', 'Hard'));
  END IF;

  -- Add learning_styles column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='projects' AND column_name='learning_styles') THEN
    ALTER TABLE projects ADD COLUMN learning_styles TEXT[];
  END IF;
END $$;

-- PROJECT TEAMS TABLE
CREATE TABLE IF NOT EXISTS project_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  team_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PROJECT TEAM MEMBERS TABLE
CREATE TABLE IF NOT EXISTS project_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES project_teams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, student_id)
);

-- PROJECT MILESTONES TABLE
CREATE TABLE IF NOT EXISTS project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_name VARCHAR(255),
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PROJECT SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS project_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES project_teams(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES project_milestones(id) ON DELETE SET NULL,
  submission_url VARCHAR(500),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  feedback TEXT,
  score DECIMAL(5, 2)
);

-- Enable RLS on project tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_submissions ENABLE ROW LEVEL SECURITY;

-- Projects Policies
DROP POLICY IF EXISTS "Teachers can manage their projects" ON projects;
CREATE POLICY "Teachers can manage their projects" ON projects
  FOR ALL USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Students can view projects for their classes" ON projects;
CREATE POLICY "Students can view projects for their classes" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_students 
      WHERE class_students.class_id = projects.class_id 
      AND class_students.student_id = auth.uid()
    )
    OR class_id IS NULL
  );

-- Project Teams Policies
DROP POLICY IF EXISTS "Teachers can manage project teams" ON project_teams;
CREATE POLICY "Teachers can manage project teams" ON project_teams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_teams.project_id 
      AND projects.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can view their teams" ON project_teams;
CREATE POLICY "Students can view their teams" ON project_teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_team_members 
      WHERE project_team_members.team_id = project_teams.id 
      AND project_team_members.student_id = auth.uid()
    )
  );

-- Project Team Members Policies
DROP POLICY IF EXISTS "Teachers can manage team members" ON project_team_members;
CREATE POLICY "Teachers can manage team members" ON project_team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_teams 
      JOIN projects ON projects.id = project_teams.project_id
      WHERE project_teams.id = project_team_members.team_id 
      AND projects.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can view team members" ON project_team_members;
CREATE POLICY "Students can view team members" ON project_team_members
  FOR SELECT USING (auth.uid() = student_id);

-- Project Milestones Policies
DROP POLICY IF EXISTS "Teachers can manage milestones" ON project_milestones;
CREATE POLICY "Teachers can manage milestones" ON project_milestones
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_milestones.project_id 
      AND projects.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can view milestones" ON project_milestones;
CREATE POLICY "Students can view milestones" ON project_milestones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      JOIN class_students ON class_students.class_id = projects.class_id
      WHERE projects.id = project_milestones.project_id 
      AND class_students.student_id = auth.uid()
    )
  );

-- Project Submissions Policies
DROP POLICY IF EXISTS "Teachers can view submissions" ON project_submissions;
CREATE POLICY "Teachers can view submissions" ON project_submissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_teams 
      JOIN projects ON projects.id = project_teams.project_id
      WHERE project_teams.id = project_submissions.team_id 
      AND projects.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can manage their submissions" ON project_submissions;
CREATE POLICY "Students can manage their submissions" ON project_submissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_team_members 
      WHERE project_team_members.team_id = project_submissions.team_id 
      AND project_team_members.student_id = auth.uid()
    )
  );

-- Create indexes for project tables
CREATE INDEX IF NOT EXISTS idx_projects_teacher_id ON projects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_projects_class_id ON projects(class_id);
CREATE INDEX IF NOT EXISTS idx_project_teams_project_id ON project_teams(project_id);
CREATE INDEX IF NOT EXISTS idx_project_team_members_team_id ON project_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_project_team_members_student_id ON project_team_members(student_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_project_id ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_project_submissions_team_id ON project_submissions(team_id);

-- =============================================================================
-- STEP 6: CREATE TRIGGER FOR AUTO-PROFILE CREATION
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'firstName', '') || ' ' || COALESCE(NEW.raw_user_meta_data->>'lastName', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
