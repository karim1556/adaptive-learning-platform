-- Create table for storing uploaded files metadata

DO $$ 
BEGIN
  -- Create class_file_uploads table if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'class_file_uploads'
  ) THEN
    CREATE TABLE class_file_uploads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT NOT NULL, -- 'marks', 'attendance', 'notes', etc.
      uploaded_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX idx_class_file_uploads_class ON class_file_uploads(class_id);
    CREATE INDEX idx_class_file_uploads_teacher ON class_file_uploads(teacher_id);
    CREATE INDEX idx_class_file_uploads_type ON class_file_uploads(file_type);

    RAISE NOTICE 'Table class_file_uploads created successfully';
  ELSE
    RAISE NOTICE 'Table class_file_uploads already exists';
  END IF;

  -- Enable RLS
  ALTER TABLE class_file_uploads ENABLE ROW LEVEL SECURITY;

  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Teachers can view their uploaded files" ON class_file_uploads;
  DROP POLICY IF EXISTS "Teachers can insert their uploaded files" ON class_file_uploads;
  DROP POLICY IF EXISTS "Teachers can delete their uploaded files" ON class_file_uploads;

  -- Create RLS policies for teachers
  CREATE POLICY "Teachers can view their uploaded files" ON class_file_uploads
  FOR SELECT
  USING (teacher_id = auth.uid());

  CREATE POLICY "Teachers can insert their uploaded files" ON class_file_uploads
  FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

  CREATE POLICY "Teachers can delete their uploaded files" ON class_file_uploads
  FOR DELETE
  USING (teacher_id = auth.uid());

  RAISE NOTICE 'RLS policies created for class_file_uploads';
END $$;

-- Create storage bucket for teacher files (run separately if needed)
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('teacher-files', 'teacher-files', false)
-- ON CONFLICT (id) DO NOTHING;

-- Verify the table
SELECT * FROM class_file_uploads LIMIT 1;
