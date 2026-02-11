-- Add milestone completion notes and project submission feedback

BEGIN;

-- Add notes column to milestone_completions table (only if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'milestone_completions'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'milestone_completions' AND column_name = 'notes'
    ) THEN
      EXECUTE 'ALTER TABLE public.milestone_completions ADD COLUMN notes TEXT';
    END IF;
  ELSE
    RAISE NOTICE 'Table public.milestone_completions not found; skipping notes column.';
  END IF;
END $$;

-- Add feedback and status columns to student_submissions table (only if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'student_submissions'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'student_submissions' AND column_name = 'status'
    ) THEN
      EXECUTE 'ALTER TABLE public.student_submissions ADD COLUMN status VARCHAR(50) DEFAULT ''pending''';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'student_submissions' AND column_name = 'teacher_feedback'
    ) THEN
      EXECUTE 'ALTER TABLE public.student_submissions ADD COLUMN teacher_feedback TEXT';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'student_submissions' AND column_name = 'reviewed_at'
    ) THEN
      EXECUTE 'ALTER TABLE public.student_submissions ADD COLUMN reviewed_at TIMESTAMP';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'student_submissions' AND column_name = 'reviewed_by'
    ) THEN
      EXECUTE 'ALTER TABLE public.student_submissions ADD COLUMN reviewed_by UUID REFERENCES public.users(id)';
    END IF;
  ELSE
    RAISE NOTICE 'Table public.student_submissions not found; skipping submission columns.';
  END IF;
END $$;

-- Create indexes only if tables exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'student_submissions'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_student_submissions_status ON public.student_submissions(status)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'milestone_completions'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_milestone_completions_student ON public.milestone_completions(student_id, project_id)';
  END IF;
END $$;

-- Also support `project_milestone_completions` (common schema variant)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'project_milestone_completions'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'project_milestone_completions' AND column_name = 'notes'
    ) THEN
      EXECUTE 'ALTER TABLE public.project_milestone_completions ADD COLUMN notes TEXT';
    END IF;

    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_project_milestone_completions_student ON public.project_milestone_completions(student_id, project_id)';
  END IF;
END $$;

-- Also support schema using `project_submissions` if present (same columns)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'project_submissions'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'project_submissions' AND column_name = 'status'
    ) THEN
      EXECUTE 'ALTER TABLE public.project_submissions ADD COLUMN status VARCHAR(50) DEFAULT ''pending''';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'project_submissions' AND column_name = 'teacher_feedback'
    ) THEN
      EXECUTE 'ALTER TABLE public.project_submissions ADD COLUMN teacher_feedback TEXT';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'project_submissions' AND column_name = 'reviewed_at'
    ) THEN
      EXECUTE 'ALTER TABLE public.project_submissions ADD COLUMN reviewed_at TIMESTAMP';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'project_submissions' AND column_name = 'reviewed_by'
    ) THEN
      EXECUTE 'ALTER TABLE public.project_submissions ADD COLUMN reviewed_by UUID REFERENCES public.users(id)';
    END IF;

    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_project_submissions_status ON public.project_submissions(status)';
  END IF;
END $$;

-- Also support `student_project_submissions` (used by app)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'student_project_submissions'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'student_project_submissions' AND column_name = 'status'
    ) THEN
      EXECUTE 'ALTER TABLE public.student_project_submissions ADD COLUMN status VARCHAR(50) DEFAULT ''pending''';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'student_project_submissions' AND column_name = 'teacher_feedback'
    ) THEN
      EXECUTE 'ALTER TABLE public.student_project_submissions ADD COLUMN teacher_feedback TEXT';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'student_project_submissions' AND column_name = 'reviewed_at'
    ) THEN
      EXECUTE 'ALTER TABLE public.student_project_submissions ADD COLUMN reviewed_at TIMESTAMP';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'student_project_submissions' AND column_name = 'reviewed_by'
    ) THEN
      EXECUTE 'ALTER TABLE public.student_project_submissions ADD COLUMN reviewed_by UUID REFERENCES public.users(id)';
    END IF;

    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_student_project_submissions_status ON public.student_project_submissions(status)';
  END IF;
END $$;

COMMIT;

-- Verification (show columns if tables exist)
SELECT 'milestone_completions columns:' AS info, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'milestone_completions'
ORDER BY ordinal_position;

SELECT 'student_submissions columns:' AS info, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'student_submissions'
ORDER BY ordinal_position;
