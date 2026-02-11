# Quick Setup Guide - Teacher Diary Fixes

## Step 1: Run Database Migrations

Copy and run these SQL scripts in your Supabase SQL Editor (in order):

### Script 1: Fix Class Students Access
```sql
-- Allow teachers to view students in their classes
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Teachers can view their class students" ON class_students;
  
  CREATE POLICY "Teachers can view their class students" ON class_students
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes 
      WHERE classes.id = class_students.class_id 
      AND classes.teacher_id = auth.uid()
    )
  );
  
  RAISE NOTICE 'Teacher access policy created for class_students';
END $$;
```

### Script 2: Create File Uploads Table
```sql
-- Create table for uploaded files
DO $$ 
BEGIN
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
      file_type TEXT NOT NULL,
      uploaded_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX idx_class_file_uploads_class ON class_file_uploads(class_id);
    CREATE INDEX idx_class_file_uploads_teacher ON class_file_uploads(teacher_id);
    CREATE INDEX idx_class_file_uploads_type ON class_file_uploads(file_type);

    RAISE NOTICE 'Table class_file_uploads created';
  END IF;

  ALTER TABLE class_file_uploads ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Teachers can view their uploaded files" ON class_file_uploads;
  DROP POLICY IF EXISTS "Teachers can insert their uploaded files" ON class_file_uploads;
  DROP POLICY IF EXISTS "Teachers can delete their uploaded files" ON class_file_uploads;

  CREATE POLICY "Teachers can view their uploaded files" ON class_file_uploads
  FOR SELECT USING (teacher_id = auth.uid());

  CREATE POLICY "Teachers can insert their uploaded files" ON class_file_uploads
  FOR INSERT WITH CHECK (teacher_id = auth.uid());

  CREATE POLICY "Teachers can delete their uploaded files" ON class_file_uploads
  FOR DELETE USING (teacher_id = auth.uid());

  RAISE NOTICE 'RLS policies created for class_file_uploads';
END $$;
```

### Script 3: Create Storage Bucket (Optional - only if using Supabase Storage)
```sql
INSERT INTO storage.buckets (id, name, public) 
VALUES ('teacher-files', 'teacher-files', false)
ON CONFLICT (id) DO NOTHING;
```

---

## Step 2: Test the Application

1. **Start the development server:**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

2. **Test Student Loading:**
   - Login as a teacher
   - Navigate to `/teacher/diary`
   - Select a class from the dropdown
   - You should now see students in both Attendance and Marks tabs

3. **Test File Upload:**
   - Go to the Marks tab
   - Click "Choose file to upload..."
   - Select a CSV, Excel, or PDF file
   - Click "Upload"
   - File should appear in the "Uploaded Files" section
   - Check for success message

4. **Test Manual Entry:**
   - Scroll to "Manual Entry - Unit Test Marks" section
   - Enter marks for students in Unit 1 and Unit 2 columns
   - Click "Save Marks"
   - Refresh page - marks should persist

---

## Troubleshooting

### Students Still Not Visible?
- Check if you have any classes created
- Verify that students are enrolled in the class
- Check browser console for errors
- Run this query to verify enrollment:
  ```sql
  SELECT cs.*, c.class_name 
  FROM class_students cs 
  JOIN classes c ON c.id = cs.class_id 
  WHERE c.teacher_id = auth.uid();
  ```

### File Upload Not Working?
- The feature falls back to localStorage if Supabase storage fails
- Check Supabase storage bucket permissions
- Verify the `teacher-files` bucket exists
- Files will still be tracked even if storage upload fails

### TypeScript Errors?
- Make sure you're using Node 18+ and Next.js 16+
- Run `npm install` or `pnpm install` to ensure dependencies are up to date

---

## What Changed?

### Database:
- ✅ Added RLS policy for teachers to view class_students
- ✅ Created class_file_uploads table for file metadata
- ✅ Added RLS policies for file uploads

### Frontend:
- ✅ Fixed TeacherHeader component to handle optional user prop
- ✅ Added file upload UI to Marks tab
- ✅ Split Marks tab into "File Upload" and "Manual Entry" sections
- ✅ Added uploaded files list with timestamps
- ✅ Implemented localStorage fallback for offline support

### Features:
- ✅ Teachers can now see students in diary
- ✅ Teachers can upload CSV/Excel/PDF files for marks
- ✅ Teachers can still manually enter marks (existing feature preserved)
- ✅ File upload history is tracked and displayed
