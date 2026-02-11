-- AdaptIQ Database Schema
-- Comprehensive adaptive learning platform

-- Users table (base user info for all roles)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'teacher', 'parent', 'admin')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Student Profiles
CREATE TABLE student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_class VARCHAR(100),
  enrollment_date TIMESTAMP DEFAULT NOW(),
  overall_mastery_score DECIMAL(5, 2) DEFAULT 0,
  engagement_index DECIMAL(5, 2) DEFAULT 50,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Teacher Profiles
CREATE TABLE teacher_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department VARCHAR(100),
  subject_area VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Parent Profiles
CREATE TABLE parent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Parent-Student relationships
CREATE TABLE parent_student (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parent_profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(parent_id, student_id)
);

-- Admin Profiles
CREATE TABLE admin_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id VARCHAR(100),
  permissions VARCHAR(255)[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Teacher-Student relationships (class enrollment)
CREATE TABLE teacher_student (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  class_name VARCHAR(100),
  enrollment_date TIMESTAMP DEFAULT NOW(),
  UNIQUE(teacher_id, student_id, class_name)
);

-- Learning Concepts/Topics
CREATE TABLE learning_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Mastery Records (per student, per concept)
CREATE TABLE mastery_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES learning_concepts(id) ON DELETE CASCADE,
  mastery_score DECIMAL(5, 2) DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW(),
  assessment_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, concept_id)
);

-- VARK Learning Preference Profiles
CREATE TABLE vark_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID UNIQUE NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  visual_score DECIMAL(5, 2) DEFAULT 25,
  auditory_score DECIMAL(5, 2) DEFAULT 25,
  reading_score DECIMAL(5, 2) DEFAULT 25,
  kinesthetic_score DECIMAL(5, 2) DEFAULT 25,
  dominant_style VARCHAR(20),
  secondary_style VARCHAR(20),
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Engagement Logs (track student activity)
CREATE TABLE engagement_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  activity_type VARCHAR(100),
  activity_description TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  duration_minutes INT
);

-- Learning Content
CREATE TABLE learning_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  concept_id UUID NOT NULL REFERENCES learning_concepts(id),
  difficulty_level VARCHAR(50) CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  learning_mode VARCHAR(50) CHECK (learning_mode IN ('visual', 'auditory', 'reading', 'kinesthetic')),
  content_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Student Content Interactions
CREATE TABLE content_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES learning_content(id),
  completed BOOLEAN DEFAULT FALSE,
  completion_date TIMESTAMP,
  time_spent_minutes INT,
  feedback_score DECIMAL(5, 2),
  viewed_at TIMESTAMP DEFAULT NOW()
);

-- AI Interaction Logs
CREATE TABLE ai_interaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  response TEXT,
  learning_style VARCHAR(20),
  context_topic VARCHAR(255),
  helpful_rating INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Projects (Project-Based Learning)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  teacher_id UUID NOT NULL REFERENCES teacher_profiles(id),
  concept_id UUID REFERENCES learning_concepts(id),
  created_at TIMESTAMP DEFAULT NOW(),
  due_date TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Project Teams
CREATE TABLE project_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  team_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Project Team Members
CREATE TABLE project_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES project_teams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES student_profiles(id),
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, student_id)
);

-- Project Milestones
CREATE TABLE project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_name VARCHAR(255),
  due_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Project Submissions
CREATE TABLE project_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES project_teams(id),
  milestone_id UUID REFERENCES project_milestones(id),
  submission_url VARCHAR(500),
  submitted_at TIMESTAMP DEFAULT NOW(),
  feedback TEXT,
  score DECIMAL(5, 2)
);

-- Create indexes for common queries
CREATE INDEX idx_student_profiles_user_id ON student_profiles(user_id);
CREATE INDEX idx_mastery_records_student_id ON mastery_records(student_id);
CREATE INDEX idx_mastery_records_concept_id ON mastery_records(concept_id);
CREATE INDEX idx_vark_profiles_student_id ON vark_profiles(student_id);
CREATE INDEX idx_engagement_logs_student_id ON engagement_logs(student_id);
CREATE INDEX idx_content_interactions_student_id ON content_interactions(student_id);
CREATE INDEX idx_ai_interaction_logs_student_id ON ai_interaction_logs(student_id);
CREATE INDEX idx_projects_teacher_id ON projects(teacher_id);
CREATE INDEX idx_teacher_student_teacher_id ON teacher_student(teacher_id);
CREATE INDEX idx_teacher_student_student_id ON teacher_student(student_id);
