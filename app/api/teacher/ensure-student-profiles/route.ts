import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * This API creates student_profiles for students who were manually added to classes
 * but don't have auth accounts. It uses a service role key to bypass RLS.
 * 
 * The student_id from class_students is used as the user_id in student_profiles
 * if no auth user exists.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const studentIds: string[] = body.studentIds || []
    
    if (!studentIds || studentIds.length === 0) {
      return NextResponse.json({ data: [], created: 0 })
    }

    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Server not configured with SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
    }

    const serverSupabase = createClient(url, serviceKey)

    // Check which students already have profiles
    const { data: existingProfiles, error: fetchError } = await serverSupabase
      .from('student_profiles')
      .select('id, user_id')
      .in('user_id', studentIds)

    if (fetchError) {
      console.error('Error fetching existing profiles:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const existingUserIds = new Set((existingProfiles || []).map(p => p.user_id))
    const toCreate = studentIds.filter(id => !existingUserIds.has(id))

    if (toCreate.length === 0) {
      // All profiles already exist
      return NextResponse.json({ 
        data: existingProfiles, 
        created: 0,
        message: 'All profiles already exist'
      })
    }

    // First, ensure these IDs exist in the public users table (required for FK constraint)
    // We'll create placeholder entries for students without real auth accounts
    const usersToInsert = toCreate.map(id => ({
      id,
      email: `student_${id.substring(0, 8)}@placeholder.local`,
      password_hash: 'PLACEHOLDER_NO_LOGIN',
      role: 'student'
    }))

    const { error: usersError } = await serverSupabase
      .from('users')
      .upsert(usersToInsert, { onConflict: 'id', ignoreDuplicates: true })

    if (usersError) {
      console.error('Error creating placeholder users:', usersError)
      // Continue anyway - users might already exist
    }

    // Create the student profiles
    const profilesToInsert = toCreate.map(id => ({
      user_id: id,
      enrollment_date: new Date().toISOString(),
      overall_mastery_score: 0,
      engagement_index: 50
    }))

    const { data: newProfiles, error: insertError } = await serverSupabase
      .from('student_profiles')
      .upsert(profilesToInsert, { onConflict: 'user_id' })
      .select('id, user_id')

    if (insertError) {
      console.error('Error creating student profiles:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Return all profiles (existing + new)
    const allProfiles = [...(existingProfiles || []), ...(newProfiles || [])]
    
    return NextResponse.json({ 
      data: allProfiles,
      created: newProfiles?.length || 0,
      message: `Created ${newProfiles?.length || 0} new profiles`
    })

  } catch (e: any) {
    console.error('Unexpected error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
