-- Teacher Diary Feature Tables
-- Attendance, Marks, Topics, and Notes tracking

-- Attendance table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance') THEN
    CREATE TABLE attendance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late')),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(class_id, student_id, date)
    );
    
    CREATE INDEX idx_attendance_class_date ON attendance(class_id, date);
    CREATE INDEX idx_attendance_student ON attendance(student_id);
  END IF;
END $$;

-- Student marks table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_marks') THEN
    CREATE TABLE student_marks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
      unit INT NOT NULL,
      marks DECIMAL(5,2) NOT NULL,
      total_marks DECIMAL(5,2) DEFAULT 100,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(class_id, student_id, unit)
    );
    
    CREATE INDEX idx_student_marks_class ON student_marks(class_id);
    CREATE INDEX idx_student_marks_student ON student_marks(student_id);
  END IF;
END $$;

-- Class topics/syllabus table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'class_topics') THEN
    CREATE TABLE class_topics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'ongoing', 'completed')),
      date TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX idx_class_topics_class ON class_topics(class_id);
    CREATE INDEX idx_class_topics_status ON class_topics(status);
  END IF;
END $$;

-- Class notes table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'class_notes') THEN
    CREATE TABLE class_notes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX idx_class_notes_class ON class_notes(class_id);
    CREATE INDEX idx_class_notes_date ON class_notes(date);
  END IF;
END $$;

-- Enable RLS for all tables
DO $$
BEGIN
  ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
  ALTER TABLE student_marks ENABLE ROW LEVEL SECURITY;
  ALTER TABLE class_topics ENABLE ROW LEVEL SECURITY;
  ALTER TABLE class_notes ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- RLS Policies for attendance
DROP POLICY IF EXISTS "Teachers can manage attendance for their classes" ON attendance;
CREATE POLICY "Teachers can manage attendance for their classes" ON attendance
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = attendance.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can view their own attendance" ON attendance;
CREATE POLICY "Students can view their own attendance" ON attendance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_profiles
      WHERE student_profiles.id = attendance.student_id
      AND student_profiles.user_id = auth.uid()
    )
  );

-- RLS Policies for student_marks
DROP POLICY IF EXISTS "Teachers can manage marks for their classes" ON student_marks;
CREATE POLICY "Teachers can manage marks for their classes" ON student_marks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = student_marks.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can view their own marks" ON student_marks;
CREATE POLICY "Students can view their own marks" ON student_marks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_profiles
      WHERE student_profiles.id = student_marks.student_id
      AND student_profiles.user_id = auth.uid()
    )
  );

-- RLS Policies for class_topics
DROP POLICY IF EXISTS "Teachers can manage topics for their classes" ON class_topics;
CREATE POLICY "Teachers can manage topics for their classes" ON class_topics
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_topics.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can view topics for their classes" ON class_topics;
CREATE POLICY "Students can view topics for their classes" ON class_topics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_students
      WHERE class_students.class_id = class_topics.class_id
      AND class_students.student_id IN (
        SELECT id FROM student_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for class_notes
DROP POLICY IF EXISTS "Teachers can manage notes for their classes" ON class_notes;
CREATE POLICY "Teachers can manage notes for their classes" ON class_notes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_notes.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can view notes for their classes" ON class_notes;
CREATE POLICY "Students can view notes for their classes" ON class_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_students
      WHERE class_students.class_id = class_notes.class_id
      AND class_students.student_id IN (
        SELECT id FROM student_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Success message
SELECT '✅ Teacher diary tables created successfully!' as status;
