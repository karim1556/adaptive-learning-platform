-- Add unique constraint for upsert to work on student_profiles.user_id
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'student_profiles_user_id_unique'
			AND conrelid = 'student_profiles'::regclass
	) THEN
		ALTER TABLE student_profiles
			ADD CONSTRAINT student_profiles_user_id_unique UNIQUE (user_id);
	END IF;
END $$;

-- Verify
SELECT conname, conrelid::regclass, conkey
FROM pg_constraint
WHERE conrelid = 'student_profiles'::regclass AND contype = 'u';

-- Success message (reports whether constraint exists)
SELECT CASE
	WHEN EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'student_profiles_user_id_unique'
			AND conrelid = 'student_profiles'::regclass
	) THEN '✅ Unique constraint present on student_profiles.user_id'
	ELSE '⚠️ Unique constraint not present'
END AS status;
