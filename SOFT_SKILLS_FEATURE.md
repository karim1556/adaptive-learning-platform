# Soft Skills Upload & Analysis Feature

## Overview
Students can now upload achievements (certificates, hackathon entries, project evidence) with descriptions. AI analyzes these and extracts soft skills, which are visible to teachers.

## What Was Implemented

### 1. Student Upload Interface
**File:** `components/student/soft-skills-uploader.tsx`
- Dropbox-style uploader for files + text description
- Real-time AI analysis using GPT
- Shows detected soft skills immediately
- Displays history of previous submissions
- Added to Student Grades page (`app/student/grades/page.tsx`)

### 2. AI Analysis API
**File:** `app/api/ai/analyze-soft-skills/route.ts`
- Accepts FormData (file + description)
- Uses OpenAI GPT-4o-mini to extract soft skills
- Returns JSON array of skill names
- Examples: teamwork, leadership, communication, problem solving, time management, adaptability, creativity, etc.

### 3. Save API Endpoint
**File:** `app/api/student/soft-skills/route.ts`
- Saves detected skills to `student_soft_skills` table in Supabase
- Best-effort insert (fails gracefully if table doesn't exist)
- Called automatically after successful analysis

### 4. Database Schema
**File:** `scripts/31-create-student-soft-skills-table.sql`
```sql
CREATE TABLE student_soft_skills (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES student_profiles(id),
  skills TEXT[],
  source TEXT,
  uploaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
```
- RLS policies for students and teachers
- Students can insert/view their own records
- Teachers can view soft skills of students in their classes

### 5. Teacher View Component
**File:** `components/teacher/student-soft-skills-view.tsx`
- Shows all detected skills as badges
- Lists individual submissions with timestamps
- Added to `components/teacher/student-insights.tsx`
- Teachers see this in student detail views

### 6. Quiz Auto-Submit (Previously implemented)
**File:** `components/student/video-with-checkpoints.tsx`
- Auto-submits quiz when student switches tabs
- Detects: visibilitychange, blur, copy, beforeunload
- Prevents cheating during video checkpoint quizzes

## How It Works

### Student Flow:
1. Go to **Grades & Mastery** page
2. Scroll to "Upload Achievements" section
3. Upload a file (certificate/screenshot) OR write a description
4. Click "Analyze & Submit"
5. AI extracts soft skills and displays them
6. Submission saved and visible in history

### Teacher Flow:
1. Go to student detail/insights page
2. Scroll to "Soft Skills" card
3. View all detected skills across all submissions
4. See individual submission history with dates

## Setup Instructions

### 1. Run Database Migration
```bash
# Connect to your Supabase database and run:
psql <connection-string> -f scripts/31-create-student-soft-skills-table.sql
```

### 2. Environment Variables
Ensure these are set in `.env.local`:
```env
OPENAI_API_KEY=sk-...
# OR
GROQ_API_KEY=gsk_...

NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 3. Start Development Server
```bash
pnpm dev
```

### 4. Test the Feature
- Login as a student
- Navigate to `/student/grades`
- Upload an achievement
- Check that skills are detected
- Login as a teacher and view the student's soft skills

## API Endpoints

### POST `/api/ai/analyze-soft-skills`
- **Input:** FormData with `file` (optional), `description`, `studentId`
- **Output:** `{ success: true, skills: ["teamwork", "leadership"], source: "file|description" }`
- **Model:** GPT-4o-mini

### POST `/api/student/soft-skills`
- **Input:** `{ studentId, skills, source }`
- **Output:** `{ success: true }`
- **Action:** Inserts into `student_soft_skills` table

## Future Enhancements
1. **OCR for Images/PDFs:** Add Tesseract.js or similar to extract text from scanned certificates
2. **Skill Categories:** Group skills (communication, technical, leadership)
3. **Endorsements:** Allow teachers to verify/endorse detected skills
4. **Skill Trends:** Show skill development over time
5. **Export:** Download soft skills portfolio as PDF

## Files Modified/Created
- ✅ `components/student/soft-skills-uploader.tsx` (new)
- ✅ `app/api/ai/analyze-soft-skills/route.ts` (new)
- ✅ `app/api/student/soft-skills/route.ts` (new)
- ✅ `components/teacher/student-soft-skills-view.tsx` (new)
- ✅ `scripts/31-create-student-soft-skills-table.sql` (new)
- ✅ `app/student/grades/page.tsx` (modified - added uploader)
- ✅ `components/teacher/student-insights.tsx` (modified - added soft skills view)
- ✅ `components/student/video-with-checkpoints.tsx` (modified - auto-submit on tab switch)

## Notes
- The AI analysis works best with clear descriptions
- File attachments are included in the prompt but may need OCR for binary formats
- The save endpoint is non-blocking and best-effort
- Teachers need students in their classes to view soft skills (RLS enforced)
