# Database Fix for Student References

## Problem
Students added to `class_students` were using random UUIDs that didn't exist in `users` or `student_profiles` tables, causing:
- **409 Conflict** errors when saving attendance/marks
- **Foreign key violations** 
- Data not persisting when navigating between pages

## Root Cause
The student creation flow was broken:
1. Teachers add students to classes with generated UUIDs
2. These UUIDs don't exist in `auth.users`, `users`, or `student_profiles`
3. When trying to save attendance/marks, FK constraints fail

## The Fix

### 1. Database Trigger (Automatic)
Created a trigger that automatically creates:
- User placeholder in `users` table
- Student profile in `student_profiles` table

**Whenever a student is added to `class_students`, the profile is created automatically.**

### 2. Migration Script
Run this to fix ALL existing broken data:

\`\`\`bash
# Connect to your Supabase database and run:
psql <your-database-url> -f scripts/29-fix-broken-student-references.sql
\`\`\`

Or in Supabase Dashboard → SQL Editor:
1. Copy contents of `scripts/29-fix-broken-student-references.sql`
2. Paste and run

This script:
- ✅ Creates missing users for all students in class_students
- ✅ Creates missing student_profiles
- ✅ Adds database trigger to auto-create profiles
- ✅ Cleans up broken attendance/marks records
- ✅ Adds proper FK constraints
- ✅ Verifies the fix

### 3. API Endpoint
Created `/api/teacher/ensure-student-profiles` that:
- Creates profiles for students without them
- Creates placeholder users if needed
- Returns the created profiles

### 4. Updated Code
- `loadStudents`: Now auto-creates profiles if missing
- `saveAttendance`: Creates profiles before saving
- `saveMarks`: Creates profiles before saving
- `addStudentToClassSupabase`: Ensures profile exists before adding to class

## How to Apply

### Step 1: Run the Migration
\`\`\`bash
# In Supabase SQL Editor, run:
scripts/29-fix-broken-student-references.sql
\`\`\`

### Step 2: Restart Your Dev Server
\`\`\`bash
# Press Ctrl+C to stop
npm run dev
\`\`\`

### Step 3: Test
1. Go to Teacher → Diary
2. Check console - should see: "Loaded students: [...]" with `student_profile_id` for all students
3. Mark attendance and save
4. Navigate away and back - attendance should persist
5. Same for marks

## Verification Queries

Run these in Supabase SQL Editor to verify:

\`\`\`sql
-- Should return 0
SELECT COUNT(*) 
FROM class_students cs
LEFT JOIN student_profiles sp ON sp.user_id = cs.student_id
WHERE sp.id IS NULL;

-- Should return 0
SELECT COUNT(*) 
FROM attendance a
LEFT JOIN student_profiles sp ON sp.id = a.student_id
WHERE sp.id IS NULL;

-- Should return 0
SELECT COUNT(*) 
FROM student_marks sm
LEFT JOIN student_profiles sp ON sp.id = sm.student_id
WHERE sp.id IS NULL;
\`\`\`

## What Changed

### Files Created:
- `scripts/29-fix-broken-student-references.sql` - Migration script with trigger
- `app/api/teacher/ensure-student-profiles/route.ts` - API to create profiles
- `DATABASE_FIX_README.md` - This file

### Files Updated:
- `app/teacher/diary/page.tsx` - Auto-creates profiles, simplified logic
- `lib/teacher-data.ts` - Ensures profiles exist before adding to class

## Future Prevention

The database trigger will **automatically** create profiles when:
- Teachers add students to classes
- Any INSERT into `class_students` happens

**No more manual profile creation needed!**

## Troubleshooting

### If students still show no `student_profile_id`:
1. Check if migration ran: `SELECT * FROM pg_trigger WHERE tgname = 'ensure_student_profile_trigger';`
2. Check console logs for errors
3. Manually run: `SELECT ensure_student_profile();` for each student

### If attendance/marks still don't save:
1. Open browser console
2. Look for "Creating missing profiles before save:" log
3. If you see FK errors, run the migration again

### If trigger doesn't fire:
\`\`\`sql
-- Recreate the trigger
DROP TRIGGER IF EXISTS ensure_student_profile_trigger ON class_students;
CREATE TRIGGER ensure_student_profile_trigger
  BEFORE INSERT ON class_students
  FOR EACH ROW
  EXECUTE FUNCTION ensure_student_profile();
\`\`\`
