import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function POST(req: NextRequest) {
  try {
    const { studentId, studentName } = await req.json()
    if (!studentId) {
      return NextResponse.json({ error: 'Student ID required' }, { status: 400 })
    }
    // If studentId looks like a UUID, query directly. Otherwise try to
    // resolve by `studentName` (fuzzy match) against whatever name-like
    // columns exist on `student_profiles` (defensive: avoid referencing
    // a specific column like `full_name` which may not exist).
    const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

    try {
      if (isUuid(studentId)) {
        // Resolve incoming UUID: it might be a student_profiles.id OR an auth user id
        let profileIdToUse = studentId
        try {
          const { data: byId } = await supabase.from('student_profiles').select('id').eq('id', studentId).maybeSingle()
          if (byId && (byId as any).id) {
            profileIdToUse = (byId as any).id
          } else {
            const { data: byUser } = await supabase.from('student_profiles').select('id').eq('user_id', studentId).maybeSingle()
            if (byUser && (byUser as any).id) {
              profileIdToUse = (byUser as any).id
            } else {
              console.warn('No student_profiles row found for provided UUID', studentId)
              return NextResponse.json({ success: true, softSkills: [] })
            }
          }
        } catch (resolveErr) {
          console.warn('Failed to resolve student profile id for soft skills lookup', resolveErr)
          return NextResponse.json({ success: true, softSkills: [] })
        }

        const { data: skills, error } = await supabase
          .from('student_soft_skills')
          .select('*')
          .eq('student_id', profileIdToUse)
          .order('uploaded_at', { ascending: false })

        if (error) {
          console.warn('Soft skills fetch failed', error)
          return NextResponse.json({ success: true, softSkills: [] })
        }
        return NextResponse.json({ success: true, softSkills: skills || [] })
      }

      // Non-UUID handling: require `studentName` to do fuzzy lookup.
      if (!studentName) {
        console.warn('Soft skills fetch skipped: non-UUID id and no studentName provided', { studentId })
        return NextResponse.json({ success: true, softSkills: [] })
      }


      // Fetch a sample row and always use all columns, even if null.
      const sampleRes = await supabase.from('student_profiles').select('*').limit(1)
      if (sampleRes.error) {
        console.warn('Unable to sample student_profiles columns', sampleRes.error)
        return NextResponse.json({ success: true, softSkills: [] })
      }
      // Use all keys from the sample row, even if values are null
      const sampleRow = (sampleRes.data && sampleRes.data[0]) || {}
      // If the sample row is empty, fallback to a hardcoded list (schema known)
      let keys = Object.keys(sampleRow)
      if (keys.length === 0) {
        // fallback: known schema columns
        keys = ['id', 'user_id', 'current_class', 'enrollment_date', 'overall_mastery_score', 'engagement_index', 'created_at', 'updated_at', 'full_name']
      }

      const nameCandidates = ['full_name', 'fullName', 'name', 'display_name', 'first_name', 'last_name', 'given_name', 'family_name']
      const presentNameCols = nameCandidates.filter((c) => keys.includes(c))

      if (presentNameCols.length === 0) {
        console.warn('No name-like columns present on student_profiles; cannot fuzzy-match', { availableColumns: keys })
        return NextResponse.json({ success: true, softSkills: [] })
      }

      // Build an OR condition string for Supabase based on existing name columns.
      const escaped = (v: string) => v.replace(/'/g, "''")
      const orClauses = presentNameCols.map((col) => `${col}.ilike.%${escaped(studentName)}%`).join(',')

      const { data: profiles, error: profErr } = await supabase
        .from('student_profiles')
        .select('id')
        .or(orClauses)
        .limit(5)

      if (profErr) {
        console.warn('Soft skills profile lookup failed', profErr)
        return NextResponse.json({ success: true, softSkills: [] })
      }

      const ids = (profiles || []).map((p: any) => p.id).filter(Boolean)
      if (ids.length === 0) return NextResponse.json({ success: true, softSkills: [] })

      const { data: skills, error: skillsErr } = await supabase
        .from('student_soft_skills')
        .select('*')
        .in('student_id', ids as string[])
        .order('uploaded_at', { ascending: false })

      if (skillsErr) {
        console.warn('Soft skills fetch failed', skillsErr)
        return NextResponse.json({ success: true, softSkills: [] })
      }

      return NextResponse.json({ success: true, softSkills: skills || [] })
    } catch (err) {
      console.warn('Soft skills fetch failed', err)
      return NextResponse.json({ success: true, softSkills: [] })
    }
  } catch (error) {
    console.error('Student profile API error:', error)
    return NextResponse.json({ error: 'Failed to fetch soft skills' }, { status: 500 })
  }
}
