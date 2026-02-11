# Teacher Diary - Fixes Applied

## Issues Fixed

### 1. **Students Not Visible**
**Problem:** The diary page showed "No students in this class"

**Root Cause:** The `class_students` table had RLS (Row Level Security) policies that only allowed students to view their own enrollments. Teachers had no policy to view the students enrolled in their classes.

**Solution:**
- Created SQL script: `scripts/27-fix-class-students-teacher-access.sql`
- Added RLS policy: "Teachers can view their class students"
- This policy allows teachers to SELECT from `class_students` where the `class_id` belongs to a class they teach

```sql
CREATE POLICY "Teachers can view their class students" ON class_students
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM classes 
    WHERE classes.id = class_students.class_id 
    AND classes.teacher_id = auth.uid()
  )
);
```

**To Apply:** Run this SQL in your Supabase SQL editor or via psql

---

### 2. **File Upload for Marks**
**Problem:** Teachers wanted to upload CSV or other files instead of manual entry

**Solution:**
- Added file upload section above the manual entry table
- Created new database table: `class_file_uploads`
- Implemented file upload functionality with these features:
  - Supports CSV, Excel, PDF, DOC, TXT files
  - Stores files in Supabase storage bucket `teacher-files`
  - Falls back to localStorage if storage fails
  - Shows list of previously uploaded files with timestamps
  - Separate "Upload File" and "Manual Entry" sections

**Files Modified:**
1. `app/teacher/diary/page.tsx`:
   - Added `marksFile` and `uploadedFiles` state
   - Added `handleFileUpload()` function
   - Added `loadUploadedFiles()` function
   - Restructured Marks tab with two sections:
     - File Upload Section (top)
     - Manual Entry Section (bottom)

2. `scripts/28-create-file-uploads-table.sql`:
   - Creates `class_file_uploads` table
   - Stores metadata: file_name, file_path, file_type, teacher_id, class_id
   - RLS policies for teachers to view/insert/delete their files

**To Apply:** Run `scripts/28-create-file-uploads-table.sql` in Supabase

---

## Database Changes Required

Run these scripts in order:

```bash
# 1. Fix class_students access for teachers
psql -f scripts/27-fix-class-students-teacher-access.sql

# 2. Create file uploads table
psql -f scripts/28-create-file-uploads-table.sql
```

Or copy-paste the SQL content into Supabase SQL Editor.

---

## Features Added

### File Upload UI
- Drag & drop zone for file selection
- Supported formats: CSV, XLSX, XLS, PDF, DOC, DOCX, TXT
- Upload button (disabled until file selected)
- List of previously uploaded files with:
  - File name
  - Upload timestamp
  - File icon

### Fallback Behavior
- If Supabase storage fails → stores metadata in database only
- If database fails → stores in localStorage with key `marks_files_{classId}`
- Always shows user-friendly success/error messages

---

## Testing

1. **Test Students Loading:**
   - Navigate to Teacher Diary
   - Select a class from dropdown
   - Students should now appear in Attendance and Marks tabs

2. **Test File Upload:**
   - Go to Marks tab
   - Click "Choose file to upload..." and select a CSV/Excel file
   - Click "Upload" button
   - File should appear in "Uploaded Files" list below
   - Check success message

3. **Test Manual Entry (existing feature):**
   - Scroll down to "Manual Entry" section
   - Enter marks for Unit 1 and Unit 2
   - Click "Save Marks"
   - Verify marks are saved and persist on page reload

---

## Technical Details

### File Upload Flow
1. User selects file via file input
2. `handleFileUpload()` triggered on button click
3. File uploaded to Supabase storage: `marks/{teacherId}/{classId}_{timestamp}.{ext}`
4. Metadata inserted into `class_file_uploads` table
5. Success alert shown, file input cleared
6. `loadUploadedFiles()` refreshes the list

### Storage Structure
```
teacher-files/
└── marks/
    └── {teacher_id}/
        ├── {class_id}_1706198400000.csv
        ├── {class_id}_1706284800000.xlsx
        └── {class_id}_1706371200000.pdf
```

### Database Schema
```sql
class_file_uploads (
  id UUID PRIMARY KEY,
  class_id UUID → classes(id),
  teacher_id UUID → profiles(id),
  file_name TEXT,
  file_path TEXT,
  file_type TEXT, -- 'marks', 'attendance', etc.
  uploaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
```
