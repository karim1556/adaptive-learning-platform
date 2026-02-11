import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase as publicSupabase } from '@/lib/supabaseClient'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, skills, source } = body as { studentId: string; skills: string[]; source?: string }

    if (!studentId || !Array.isArray(skills)) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Prefer using a server-side service_role key to bypass RLS for inserts.
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

    let client = publicSupabase
    if (serviceRole && url) {
      try {
        client = createClient(url, serviceRole)
      } catch (e) {
        console.warn('Failed to create service-role supabase client, falling back to public client', e)
        client = publicSupabase
      }
    }

    // Perform insert and check result for errors (Supabase client does not throw)
    try {
      // Ensure we have a valid student_profiles.id to satisfy FK
      const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
      let profileIdToUse = studentId

      if (isUuid(studentId)) {
        // If the incoming id is already a student_profiles.id, use it.
        const { data: byId } = await client
          .from('student_profiles')
          .select('id')
          .eq('id', studentId)
          .maybeSingle()
        if (byId && (byId as any).id) {
          profileIdToUse = (byId as any).id
        } else {
          // Try resolving as user_id
          const { data: byUser } = await client
            .from('student_profiles')
            .select('id')
            .eq('user_id', studentId)
            .maybeSingle()
          if (byUser && (byUser as any).id) {
            profileIdToUse = (byUser as any).id
          } else {
            // Create a minimal student_profiles row for this user_id
            const { data: created, error: createErr } = await client
              .from('student_profiles')
              .insert({ user_id: studentId })
              .select('id')
              .maybeSingle()
            if (createErr) {
              console.warn('Failed to create student_profiles row:', createErr)
              return NextResponse.json({ success: false, error: String(createErr) }, { status: 500 })
            }
            profileIdToUse = (created as any)?.id || studentId
          }
        }
      } else {
        // Non-UUID ids (local/mock) cannot be mapped to student_profiles; return informative error
        return NextResponse.json({ success: false, error: 'studentId is not a UUID and cannot be mapped to a student profile' }, { status: 400 })
      }

      const { data, error } = await client
        .from('student_soft_skills')
        .insert({ student_id: profileIdToUse, skills, source })

      if (error) {
        console.warn('Failed to insert student_soft_skills:', error)
        return NextResponse.json({ success: false, error: error.message || error }, { status: 500 })
      }

      return NextResponse.json({ success: true, data })
    } catch (err) {
      console.error('Unexpected insert error:', err)
      return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
    }
  } catch (err) {
    console.error('Save soft skills error', err)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
