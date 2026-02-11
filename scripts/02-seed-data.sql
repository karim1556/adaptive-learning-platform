-- Seed data for AdaptIQ
-- Mock data for demonstration

-- Clear existing data
TRUNCATE users CASCADE;

-- Insert Users
INSERT INTO users (id, email, password_hash, first_name, last_name, role) VALUES
-- Students
('11111111-1111-1111-1111-111111111111', 'alex@student.com', 'hashed_pwd_1', 'Alex', 'Johnson', 'student'),
('22222222-2222-2222-2222-222222222222', 'jordan@student.com', 'hashed_pwd_2', 'Jordan', 'Smith', 'student'),
('33333333-3333-3333-3333-333333333333', 'casey@student.com', 'hashed_pwd_3', 'Casey', 'Williams', 'student'),
('44444444-4444-4444-4444-444444444444', 'morgan@student.com', 'hashed_pwd_4', 'Morgan', 'Brown', 'student'),
-- Teachers
('55555555-5555-5555-5555-555555555555', 'mrs.jones@teacher.com', 'hashed_pwd_5', 'Margaret', 'Jones', 'teacher'),
('66666666-6666-6666-6666-666666666666', 'mr.davis@teacher.com', 'hashed_pwd_6', 'David', 'Davis', 'teacher'),
-- Parents
('77777777-7777-7777-7777-777777777777', 'parent1@home.com', 'hashed_pwd_7', 'Patricia', 'Johnson', 'parent'),
('88888888-8888-8888-8888-888888888888', 'parent2@home.com', 'hashed_pwd_8', 'Paul', 'Smith', 'parent'),
-- Admin
('99999999-9999-9999-9999-999999999999', 'admin@school.com', 'hashed_pwd_9', 'Admin', 'User', 'admin');

-- Insert Student Profiles
INSERT INTO student_profiles (id, user_id, current_class, overall_mastery_score, engagement_index) VALUES
('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Math 101', 75.5, 82),
('a2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Math 101', 62.3, 65),
('a3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Physics 201', 88.7, 78),
('a4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'Physics 201', 71.2, 55);

-- Insert Teacher Profiles
INSERT INTO teacher_profiles (id, user_id, department, subject_area) VALUES
('b5555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', 'Mathematics', 'Algebra & Calculus'),
('b6666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', 'Physics', 'Mechanics & Thermodynamics');

-- Insert Parent Profiles
INSERT INTO parent_profiles (id, user_id) VALUES
('c7777777-7777-7777-7777-777777777777', '77777777-7777-7777-7777-777777777777'),
('c8888888-8888-8888-8888-888888888888', '88888888-8888-8888-8888-888888888888');

-- Insert Parent-Student relationships
INSERT INTO parent_student (parent_id, student_id) VALUES
('c7777777-7777-7777-7777-777777777777', 'a1111111-1111-1111-1111-111111111111'),
('c7777777-7777-7777-7777-777777777777', 'a2222222-2222-2222-2222-222222222222'),
('c8888888-8888-8888-8888-888888888888', 'a3333333-3333-3333-3333-333333333333');

-- Insert Admin Profiles
INSERT INTO admin_profiles (id, user_id, school_id, permissions) VALUES
('d9999999-9999-9999-9999-999999999999', '99999999-9999-9999-9999-999999999999', 'SCHOOL001', '{"view_all", "manage_users", "manage_content"}');

-- Insert Teacher-Student relationships
INSERT INTO teacher_student (teacher_id, student_id, class_name) VALUES
('b5555555-5555-5555-5555-555555555555', 'a1111111-1111-1111-1111-111111111111', 'Math 101'),
('b5555555-5555-5555-5555-555555555555', 'a2222222-2222-2222-2222-222222222222', 'Math 101'),
('b6666666-6666-6666-6666-666666666666', 'a3333333-3333-3333-3333-333333333333', 'Physics 201'),
('b6666666-6666-6666-6666-666666666666', 'a4444444-4444-4444-4444-444444444444', 'Physics 201');

-- Insert Learning Concepts
INSERT INTO learning_concepts (id, name, description, category) VALUES
('e1111111-1111-1111-1111-111111111111', 'Linear Equations', 'Understanding and solving linear equations', 'Mathematics'),
('e2222222-2222-2222-2222-222222222222', 'Quadratic Functions', 'Analyzing parabolas and quadratic expressions', 'Mathematics'),
('e3333333-3333-3333-3333-333333333333', 'Kinematics', 'Motion, velocity, and acceleration', 'Physics'),
('e4444444-4444-4444-4444-444444444444', 'Newton Laws', 'Forces and Newton''s laws of motion', 'Physics'),
('e5555555-5555-5555-5555-555555555555', 'Thermodynamics', 'Heat, temperature, and energy transfer', 'Physics');

-- Insert Mastery Records
INSERT INTO mastery_records (student_id, concept_id, mastery_score, assessment_count) VALUES
('a1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', 85, 5),
('a1111111-1111-1111-1111-111111111111', 'e2222222-2222-2222-2222-222222222222', 72, 3),
('a2222222-2222-2222-2222-222222222222', 'e1111111-1111-1111-1111-111111111111', 58, 4),
('a2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222222', 45, 2),
('a3333333-3333-3333-3333-333333333333', 'e3333333-3333-3333-3333-333333333333', 92, 6),
('a3333333-3333-3333-3333-333333333333', 'e4444444-4444-4444-4444-444444444444', 88, 5),
('a3333333-3333-3333-3333-333333333333', 'e5555555-5555-5555-5555-555555555555', 82, 4),
('a4444444-4444-4444-4444-444444444444', 'e3333333-3333-3333-3333-333333333333', 75, 3),
('a4444444-4444-4444-4444-444444444444', 'e4444444-4444-4444-4444-444444444444', 68, 3);

-- Insert VARK Profiles
INSERT INTO vark_profiles (student_id, visual_score, auditory_score, reading_score, kinesthetic_score, dominant_style, secondary_style) VALUES
('a1111111-1111-1111-1111-111111111111', 35, 20, 30, 15, 'visual', 'reading'),
('a2222222-2222-2222-2222-222222222222', 15, 40, 25, 20, 'auditory', 'reading'),
('a3333333-3333-3333-3333-333333333333', 25, 30, 20, 25, 'auditory', 'kinesthetic'),
('a4444444-4444-4444-4444-444444444444', 20, 25, 15, 40, 'kinesthetic', 'auditory');

-- Insert Learning Content
INSERT INTO learning_content (id, title, description, concept_id, difficulty_level, learning_mode, content_url) VALUES
('f1111111-1111-1111-1111-111111111111', 'Linear Equations Explained', 'Visual guide to solving linear equations', 'e1111111-1111-1111-1111-111111111111', 'beginner', 'visual', 'https://example.com/linear-visual'),
('f2222222-2222-2222-2222-222222222222', 'Linear Equations Podcast', 'Audio explanation of linear equations', 'e1111111-1111-1111-1111-111111111111', 'beginner', 'auditory', 'https://example.com/linear-audio'),
('f3333333-3333-3333-3333-333333333333', 'Step-by-Step Linear Solutions', 'Kinesthetic practice with linear equations', 'e1111111-1111-1111-1111-111111111111', 'intermediate', 'kinesthetic', 'https://example.com/linear-practice'),
('f4444444-4444-4444-4444-444444444444', 'Quadratic Deep Dive', 'Advanced visual analysis of quadratics', 'e2222222-2222-2222-2222-222222222222', 'advanced', 'visual', 'https://example.com/quadratic-visual'),
('f5555555-5555-5555-5555-555555555555', 'Kinematics in Motion', 'Video simulation of kinematic principles', 'e3333333-3333-3333-3333-333333333333', 'intermediate', 'visual', 'https://example.com/kinematics-video'),
('f6666666-6666-6666-6666-666666666666', 'Newton Laws Explained', 'Text-based comprehensive guide', 'e4444444-4444-4444-4444-444444444444', 'intermediate', 'reading', 'https://example.com/newton-text');

-- Insert Engagement Logs
INSERT INTO engagement_logs (student_id, activity_type, activity_description, duration_minutes) VALUES
('a1111111-1111-1111-1111-111111111111', 'content_view', 'Watched Linear Equations video', 25),
('a1111111-1111-1111-1111-111111111111', 'assessment', 'Completed quiz on linear equations', 15),
('a1111111-1111-1111-1111-111111111111', 'ai_chat', 'Asked AI about quadratic problems', 10),
('a2222222-2222-2222-2222-222222222222', 'content_view', 'Listened to Linear Equations podcast', 30),
('a2222222-2222-2222-2222-222222222222', 'content_view', 'Started kinesthetic linear practice', 20),
('a3333333-3333-3333-3333-333333333333', 'content_view', 'Viewed kinematics simulation', 35),
('a3333333-3333-3333-3333-333333333333', 'assessment', 'Completed physics test', 45),
('a3333333-3333-3333-3333-333333333333', 'ai_chat', 'Asked AI about Newton Laws', 8),
('a4444444-4444-4444-4444-444444444444', 'content_view', 'Watched kinematics video', 20);

-- Insert Content Interactions
INSERT INTO content_interactions (student_id, content_id, completed, time_spent_minutes, feedback_score) VALUES
('a1111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', TRUE, 25, 4.5),
('a1111111-1111-1111-1111-111111111111', 'f3333333-3333-3333-3333-333333333333', TRUE, 30, 4.0),
('a2222222-2222-2222-2222-222222222222', 'f2222222-2222-2222-2222-222222222222', TRUE, 30, 3.8),
('a2222222-2222-2222-2222-222222222222', 'f3333333-3333-3333-3333-333333333333', FALSE, 15, 3.2),
('a3333333-3333-3333-3333-333333333333', 'f5555555-5555-5555-5555-555555555555', TRUE, 35, 4.7),
('a3333333-3333-3333-3333-333333333333', 'f6666666-6666-6666-6666-666666666666', TRUE, 28, 4.6),
('a4444444-4444-4444-4444-444444444444', 'f5555555-5555-5555-5555-555555555555', FALSE, 20, 3.5);

-- Insert AI Interaction Logs
INSERT INTO ai_interaction_logs (student_id, query, response, learning_style, context_topic, helpful_rating) VALUES
('a1111111-1111-1111-1111-111111111111', 'How do I solve 2x + 5 = 13?', 'Let me show you a visual step-by-step diagram: 1) Start with 2x + 5 = 13 2) Subtract 5: 2x = 8 3) Divide by 2: x = 4', 'visual', 'Linear Equations', 5),
('a1111111-1111-1111-1111-111111111111', 'What is a parabola?', 'A parabola is a U-shaped curve. Here''s a visual representation...', 'visual', 'Quadratic Functions', 4),
('a3333333-3333-3333-3333-333333333333', 'Explain Newton''s first law', 'Newton''s first law states that an object in motion stays in motion unless acted upon by an external force. Imagine a ball rolling on a frictionless surface...', 'kinesthetic', 'Newton Laws', 5),
('a4444444-4444-4444-4444-444444444444', 'Help me understand velocity', 'Velocity is the rate of change of position. Think of it as: velocity = distance / time. Let''s work through a practical example...', 'kinesthetic', 'Kinematics', 4);

-- Insert Projects
INSERT INTO projects (id, title, description, teacher_id, concept_id, due_date) VALUES
('aa111111-1111-1111-1111-111111111111', 'Real-World Linear Equations', 'Apply linear equations to real-world scenarios', 'b5555555-5555-5555-5555-555555555555', 'e1111111-1111-1111-1111-111111111111', NOW() + INTERVAL '30 days'),
('aa222222-2222-2222-2222-222222222222', 'Ramp Experiment', 'Hands-on kinematics with physical ramps', 'b6666666-6666-6666-6666-666666666666', 'e3333333-3333-3333-3333-333333333333', NOW() + INTERVAL '25 days');

-- Insert Project Teams
INSERT INTO project_teams (id, project_id, team_name) VALUES
('ab111111-1111-1111-1111-111111111111', 'aa111111-1111-1111-1111-111111111111', 'Team Alpha'),
('ab222222-2222-2222-2222-222222222222', 'aa111111-1111-1111-1111-111111111111', 'Team Beta'),
('ab333333-3333-3333-3333-333333333333', 'aa222222-2222-2222-2222-222222222222', 'Physics Team');

-- Insert Project Team Members
INSERT INTO project_team_members (team_id, student_id) VALUES
('ab111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111'),
('ab111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222'),
('ab222222-2222-2222-2222-222222222222', 'a3333333-3333-3333-3333-333333333333'),
('ab333333-3333-3333-3333-333333333333', 'a3333333-3333-3333-3333-333333333333'),
('ab333333-3333-3333-3333-333333333333', 'a4444444-4444-4444-4444-444444444444');

-- Insert Project Milestones
INSERT INTO project_milestones (id, project_id, milestone_name, due_date) VALUES
('ac111111-1111-1111-1111-111111111111', 'aa111111-1111-1111-1111-111111111111', 'Research & Planning', NOW() + INTERVAL '10 days'),
('ac222222-2222-2222-2222-222222222222', 'aa111111-1111-1111-1111-111111111111', 'Draft Report', NOW() + INTERVAL '20 days'),
('ac333333-3333-3333-3333-333333333333', 'aa222222-2222-2222-2222-222222222222', 'Setup Experiment', NOW() + INTERVAL '8 days'),
('ac444444-4444-4444-4444-444444444444', 'aa222222-2222-2222-2222-222222222222', 'Data Collection', NOW() + INTERVAL '18 days');

-- Insert Project Submissions
INSERT INTO project_submissions (team_id, milestone_id, submission_url, feedback, score) VALUES
('ab111111-1111-1111-1111-111111111111', 'ac111111-1111-1111-1111-111111111111', 'https://example.com/team-alpha-research', 'Great research focus', 9.0),
('ab333333-3333-3333-3333-333333333333', 'ac333333-3333-3333-3333-333333333333', 'https://example.com/physics-setup', 'Well organized experiment', 9.5);
