# Adaptive Practice System - Setup Guide

## Overview
The adaptive practice system has been converted from static demo data to dynamic Supabase-backed data. Students will now see their actual weak areas based on real mastery tracking.

## What Changed

### 1. `lib/lesson-service.ts` - getStudentMastery()
- **Before**: Only read from localStorage (static/demo data)
- **After**: Fetches from `mastery_records` table in Supabase with learning_concepts join
- **Impact**: Practice page now shows real student performance data

### 2. Database Schema Extensions
- Added columns to `mastery_records`:
  - `checkpoints_passed` - number of checkpoint quizzes passed
  - `total_checkpoints` - total checkpoints available
  - `lessons_completed` - lessons the student completed
  - `total_lessons` - total lessons for this concept
  - `last_activity` - when student last practiced this concept

### 3. Debug Logging
- Added console.debug statements throughout:
  - `getStudentMastery()` - logs Supabase queries and results
  - `app/student/practice/page.tsx` - logs mastery data and identified gaps

## Setup Instructions

### Required Steps (Run in Order):

1. **Run Database Migration**
   - Open Supabase SQL Editor
   - Execute: `scripts/22-setup-adaptive-practice-complete.sql`
   - This will:
     - Add new columns to mastery_records
     - Populate sample data for ALL students
     - Verify the setup worked

2. **Restart Development Server**
   ```bash
   # Stop current server (Ctrl+C)
   pnpm dev
   # OR
   npm run dev
   ```

3. **Test the Practice Page**
   - Login as a student
   - Navigate to: http://localhost:3000/student/practice
   - Open browser DevTools (F12) → Console tab
   - Look for debug logs like:
     ```
     [getStudentMastery] Fetching mastery for student: <uuid>
     [getStudentMastery] Supabase query result: { recordCount: 12, error: null }
     [AdaptivePractice] Mastery data received: [{...}]
     [AdaptivePractice] Concept gaps identified: [{...}]
     ```

4. **Verify Dynamic Data**
   - Page should show: "We've identified X concepts to focus on"
   - Focus Areas grid should display actual concepts with real mastery %
   - Each concept should show:
     - Priority badge (critical/high/medium/low)
     - Mastery percentage (not 0%)
     - "Practice This" button

## Expected Results

### Before Fix (Static):
- Always showed "Linear Equations" at 0%
- Hardcoded single concept
- Priority: "critical" (static)

### After Fix (Dynamic):
- Shows 5-10 actual weak concepts per student
- Real mastery scores (e.g., 25%, 42%, 68%)
- Dynamic priorities based on actual scores:
  - < 30% → critical (red)
  - 30-50% → high (orange)
  - 50-65% → medium (yellow)
  - 65-80% → low (green)

## Troubleshooting

### Issue: "0 concepts to focus on"
**Cause**: No mastery_records data for this student
**Solution**: 
- Re-run `scripts/22-setup-adaptive-practice-complete.sql`
- Or manually add data using `scripts/20-populate-sample-mastery.sql`

### Issue: Console shows "Supabase error: permission denied"
**Cause**: RLS policies blocking student access to mastery_records
**Solution**: Add RLS policy or temporarily disable RLS:
```sql
ALTER TABLE mastery_records DISABLE ROW LEVEL SECURITY;
```

### Issue: Still seeing static "Linear Equations" data
**Cause**: Development server not restarted, or browser cache
**Solution**:
1. Stop dev server (Ctrl+C)
2. Clear browser cache (Ctrl+Shift+Delete)
3. Restart server: `pnpm dev`
4. Hard refresh page (Ctrl+Shift+R)

### Issue: Console logs show "No Supabase data, updating from progress..."
**Cause**: Migration not run yet, or student has no mastery records
**Solution**:
1. Verify migration ran: Check Supabase → SQL Editor → History
2. Check data exists: Run `scripts/21-verify-adaptive-practice.sql`
3. If no data, run `scripts/22-setup-adaptive-practice-complete.sql`

## Verification Queries

Run these in Supabase SQL Editor to verify:

```sql
-- Check if new columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'mastery_records'
AND column_name IN ('checkpoints_passed', 'total_checkpoints', 'lessons_completed');

-- Count mastery records per student
SELECT 
  sp.email,
  COUNT(mr.id) as record_count,
  AVG(mr.mastery_score) as avg_mastery
FROM student_profiles sp
LEFT JOIN mastery_records mr ON mr.student_id = sp.id
GROUP BY sp.email;

-- Show actual gaps for a student
SELECT 
  lc.name,
  mr.mastery_score,
  CASE 
    WHEN mr.mastery_score < 30 THEN 'critical'
    WHEN mr.mastery_score < 50 THEN 'high'
    WHEN mr.mastery_score < 65 THEN 'medium'
    ELSE 'low'
  END as priority
FROM mastery_records mr
JOIN learning_concepts lc ON lc.id = mr.concept_id
WHERE mr.student_id = (SELECT id FROM student_profiles LIMIT 1)
AND mr.mastery_score < 80
ORDER BY mr.mastery_score;
```

## How It Works (Technical)

1. **Student visits practice page** → `app/student/practice/page.tsx`
2. **loadData() executes**:
   - Calls `getStudentMastery(userId)`
   - Queries `mastery_records` table with learning_concepts join
   - Returns array of StudentMasteryData with real scores
3. **identifyConceptGaps()** processes mastery data:
   - Filters concepts with mastery < 80%
   - Calculates priority (critical/high/medium/low)
   - Sorts by priority then by score (lowest first)
4. **UI renders** dynamically:
   - Maps over conceptGaps array
   - Displays each concept with real name, score, priority
   - "Practice This" button starts adaptive session for that concept

## Related Files

- `lib/lesson-service.ts` - Main data fetching (getStudentMastery)
- `lib/intelligence/adaptivePracticeEngine.ts` - Gap identification logic
- `app/student/practice/page.tsx` - Practice UI
- `scripts/19-extend-mastery-records.sql` - Add columns migration
- `scripts/20-populate-sample-mastery.sql` - Sample data for one student
- `scripts/21-verify-adaptive-practice.sql` - Verification queries
- `scripts/22-setup-adaptive-practice-complete.sql` - **RUN THIS ONE** (all-in-one setup)

## Next Steps (Optional)

1. **Connect to Real Lesson Progress**:
   - Currently using sample data
   - Future: Auto-update mastery_records when students complete lessons
   - Implement in `updateStudentMastery()` function

2. **Add Practice Question Generation**:
   - Currently shows demo questions
   - Future: Generate questions from learning_concepts → question_bank

3. **Track Practice Results**:
   - Save practice session results to new `practice_sessions` table
   - Update mastery_records based on practice performance

## Support

If issues persist:
1. Check browser console for debug logs
2. Run verification SQL queries
3. Check Supabase logs (Dashboard → Logs → Postgres)
4. Verify student is logged in and has valid user ID
