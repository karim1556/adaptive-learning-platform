import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const userIds: string[] = body.userIds || []
    const students: Array<any> = body.students || []
    if ((!userIds || userIds.length === 0) && (!students || students.length === 0)) {
      return NextResponse.json({ data: [] })
    }

    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Server not configured with SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
    }

    const serverSupabase = createClient(url, serviceKey)

    // We'll produce a list of valid user IDs to upsert profiles for, and collect invalid identifiers
    const invalidUserIds: string[] = []
    const userIdsToUpsert: string[] = []

    // Helper: fetch all existing admin users (paged) and build maps by id and email
    const allUsers: any[] = []
    try {
      let nextPage = 1
      let lastPage = false
      while (!lastPage) {
        const { data, error } = await serverSupabase.auth.admin.listUsers({ page: nextPage, perPage: 1000 })
        if (error) throw error
        if (data && data.users) {
          allUsers.push(...data.users)
          if (data.users.length < 1000) lastPage = true
          else nextPage++
        } else {
          lastPage = true
        }
      }
    } catch (e) {
      console.error('Error listing admin users:', e)
      return NextResponse.json({ error: 'Failed to fetch auth users', details: String(e) }, { status: 500 })
    }

    const usersById = new Map(allUsers.map((u: any) => [u.id, u]))
    const usersByEmail = new Map(allUsers.map((u: any) => [u.email?.toLowerCase(), u]))

    // Fetch public `users` table rows (student_profiles.user_id references users.id)
    let publicUsers: any[] = []
    try {
      const { data: puData, error: puErr } = await serverSupabase.from('users').select('id, email, first_name, last_name')
      if (puErr) throw puErr
      publicUsers = puData || []
    } catch (e) {
      console.error('Error fetching public users table:', e)
      return NextResponse.json({ error: 'Failed to fetch public users', details: String(e) }, { status: 500 })
    }

    const publicUsersById = new Map(publicUsers.map((u: any) => [u.id, u]))
    const publicUsersByEmail = new Map(publicUsers.map((u: any) => [u.email?.toLowerCase(), u]))

    // If client provided raw userIds, validate them
    if (userIds && userIds.length > 0) {
      for (const uid of userIds) {
        // If public users table already has the id, accept it
        if (publicUsersById.has(uid)) {
          userIdsToUpsert.push(uid)
          continue
        }

        // If admin auth user exists but public users row missing, try to create it
        if (usersById.has(uid)) {
          const adminUser = usersById.get(uid)
          try {
            const insertPayload: any = { 
              id: uid, 
              email: adminUser.email || `student_${uid}@placeholder.local`, 
              password_hash: 'AUTH_MANAGED', 
              role: 'student' 
            }
            if (adminUser.user_metadata) {
              insertPayload.first_name = adminUser.user_metadata.first_name || adminUser.user_metadata.firstName
              insertPayload.last_name = adminUser.user_metadata.last_name || adminUser.user_metadata.lastName
            }
            await serverSupabase.from('users').upsert(insertPayload, { onConflict: 'id' })
            userIdsToUpsert.push(uid)
            continue
          } catch (e) {
            console.error('Failed to create public users row for', uid, e)
            invalidUserIds.push(uid)
            continue
          }
        }

        invalidUserIds.push(uid)
      }
    }

    // If client provided students (with email/name), ensure auth users exist (create if missing)
    if (students && students.length > 0) {
      for (const s of students) {
        const email = (s.email || '').toLowerCase()
        if (!email) {
          // cannot create auth user without email
          invalidUserIds.push(s.id || s.email || JSON.stringify(s))
          continue
        }

        let userRecord = usersByEmail.get(email)
        if (!userRecord) {
          // create the auth user via admin API
          try {
            const password = s.password || 'TempPassword123!'
            const { data: created, error: createErr } = await serverSupabase.auth.admin.createUser({
              email,
              email_confirm: true,
              password,
              user_metadata: {
                first_name: s.first_name || s.firstName || null,
                last_name: s.last_name || s.lastName || null,
                role: s.role || 'student'
              }
            })
            if (createErr) {
              console.error('Error creating user for email', email, createErr)
              invalidUserIds.push(email)
              continue
            }
            userRecord = created?.user
            // Add to our local maps for subsequent iterations
            if (userRecord) {
              usersById.set(userRecord.id, userRecord)
              usersByEmail.set(email, userRecord)
            }
            // Ensure a corresponding row exists in public `users` table to satisfy FK
            try {
              const insertPayload: any = { id: userRecord.id, email, password_hash: 'AUTH_MANAGED', role: s.role || 'student' }
              if (s.first_name) insertPayload.first_name = s.first_name
              if (s.last_name) insertPayload.last_name = s.last_name
              await serverSupabase.from('users').upsert(insertPayload, { onConflict: 'id' })
            } catch (e) {
              console.error('Failed to insert into public users table for', email, e)
              invalidUserIds.push(email)
              continue
            }
          } catch (e) {
            console.error('Exception creating user for', email, e)
            invalidUserIds.push(email)
            continue
          }
        }

        // If an admin user existed previously but public users table lacked row, ensure it's present now
        if (userRecord && userRecord.id && !publicUsersById.has(userRecord.id)) {
          try {
            const insertPayload: any = { id: userRecord.id, email, password_hash: 'AUTH_MANAGED', role: s.role || 'student' }
            if (s.first_name) insertPayload.first_name = s.first_name
            if (s.last_name) insertPayload.last_name = s.last_name
            await serverSupabase.from('users').upsert(insertPayload, { onConflict: 'id' })
          } catch (e) {
            console.error('Failed to ensure public users row for', userRecord.id, e)
            invalidUserIds.push(email)
            continue
          }
        }

        if (userRecord && userRecord.id) {
          userIdsToUpsert.push(userRecord.id)
        } else {
          invalidUserIds.push(email)
        }
      }
    }

    if (userIdsToUpsert.length === 0) {
      return NextResponse.json({ data: [], invalidUserIds, message: 'No valid users to create profiles for' })
    }

    // Prepare upserts for student_profiles
    const upserts = userIdsToUpsert.map((u) => ({
      user_id: u,
      enrollment_date: new Date().toISOString(),
      overall_mastery_score: 0,
      engagement_index: 50
    }))

    const { data, error } = await serverSupabase
      .from('student_profiles')
      .upsert(upserts, { onConflict: 'user_id' })
      .select('id, user_id')

    if (error) {
      console.error('Server upsert error:', error)
      return NextResponse.json({ error: error.message, invalidUserIds }, { status: 500 })
    }

    return NextResponse.json({ data, invalidUserIds })
  } catch (e: any) {
    console.error('Unexpected error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
