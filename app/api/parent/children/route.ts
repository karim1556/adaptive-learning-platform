import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPA_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ''

export async function POST(req: NextRequest) {
  try {
    if (!SUPA_URL || !SUPA_SERVICE_ROLE) {
      return NextResponse.json({ error: 'Service key not configured' }, { status: 500 })
    }

    const body = await req.json()
    const userId: string | undefined = body?.userId
    if (!userId) return NextResponse.json({ children: [] })

    const svc = createClient(SUPA_URL, SUPA_SERVICE_ROLE)

    // Resolve parent_profiles by user_id or by id
    let parentId: string | undefined
    const { data: ppByUser } = await svc.from('parent_profiles').select('id, user_id').eq('user_id', userId).maybeSingle()
    if (ppByUser?.id) parentId = ppByUser.id
    else {
      const { data: ppById } = await svc.from('parent_profiles').select('id, user_id').eq('id', userId).maybeSingle()
      if (ppById?.id) parentId = ppById.id
    }

    if (!parentId) return NextResponse.json({ children: [] })

    const studentIdFilter: string | undefined = body?.studentId

    // Determine which parent_student rows to process
    let linkRows: any[] | null = null
    if (studentIdFilter) {
      const { data: linkCheck } = await svc.from('parent_student').select('id,student_id').eq('parent_id', parentId).eq('student_id', studentIdFilter).maybeSingle()
      if (!linkCheck) return NextResponse.json({ children: [] })
      linkRows = [{ student_id: studentIdFilter }]
    } else {
      const { data: allLinks } = await svc.from('parent_student').select('student_id').eq('parent_id', parentId)
      if (!allLinks || allLinks.length === 0) return NextResponse.json({ children: [] })
      linkRows = allLinks
    }

    const children: any[] = []
    for (const l of linkRows) {
      const studentId = (l as any).student_id
      if (!studentId) continue

      // Fetch profile first so we can resolve the user id
      const { data: sp } = await svc.from('student_profiles').select('*').eq('id', studentId).maybeSingle()
      if (!sp) continue

      const [uRes, varkRes, enrollmentsRes, masteryRes, activityRes] = await Promise.all([
        svc.from('users').select('first_name, last_name, email').eq('id', sp.user_id).maybeSingle(),
        svc.from('vark_profiles').select('*').eq('student_id', studentId).maybeSingle(),
        svc.from('class_students').select('*, classes(*)').eq('student_id', studentId),
        svc.from('mastery_records').select('*, learning_concepts(*)').eq('student_id', studentId),
        svc.from('engagement_logs').select('*').eq('student_id', studentId).order('timestamp', { ascending: false }).limit(5),
      ])

      const u = uRes?.data
      let vark = varkRes?.data
      const name = u?.first_name || u?.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : u?.email || 'Student'
      const overallMastery = Number(sp.overall_mastery_score ?? sp.overall_mastery ?? 0)
      const engagementIndex = Number(sp.engagement_index ?? sp.engagement_index_score ?? 50)
      const engagementLevel = engagementIndex
      const engagementStatus = engagementLevel >= 70 ? 'high' : engagementLevel >= 50 ? 'medium' : 'low'

      let enrollments = enrollmentsRes?.data || []
      let mastery = masteryRes?.data || []
      let activity = activityRes?.data || []

      // Fallbacks: some datasets may reference the student's user id instead of the profile id
      if (!vark && sp.user_id) {
        const { data: v2 } = await svc.from('vark_profiles').select('*').eq('student_id', sp.user_id).maybeSingle()
        if (v2) vark = v2
      }
      if ((!enrollments || enrollments.length === 0) && sp.user_id) {
        const { data: en2 } = await svc.from('class_students').select('*, classes(*)').eq('student_id', sp.user_id)
        if (en2 && en2.length) enrollments = en2
      }
      if ((!mastery || mastery.length === 0) && sp.user_id) {
        const { data: m2 } = await svc.from('mastery_records').select('*, learning_concepts(*)').eq('student_id', sp.user_id)
        if (m2 && m2.length) mastery = m2
      }
      if ((!activity || activity.length === 0) && sp.user_id) {
        const { data: a2 } = await svc.from('engagement_logs').select('*').eq('student_id', sp.user_id).order('timestamp', { ascending: false }).limit(5)
        if (a2 && a2.length) activity = a2
      }

      // If no enrollments found, use profile current_class as a simple fallback
      if ((!enrollments || enrollments.length === 0) && sp.current_class) {
        enrollments = [{ class_id: null, class_code: null, classes: { class_name: sp.current_class }, created_at: sp.enrollment_date || sp.created_at || null }]
      }

      // If no VARK profile, try to infer from AI logs (learning_style) for either profile id or user id
      if (!vark && sp.user_id) {
        const { data: aiByProfile } = await svc.from('ai_interaction_logs').select('learning_style').eq('student_id', studentId)
        const { data: aiByUser } = await svc.from('ai_interaction_logs').select('learning_style').eq('student_id', sp.user_id)
        const combined = (aiByProfile || []).concat(aiByUser || [])
        if (combined && combined.length) {
          const freq: Record<string, number> = {}
          for (const r of combined) if (r?.learning_style) freq[r.learning_style] = (freq[r.learning_style] || 0) + 1
          const sorted = Object.entries(freq).sort((a,b) => b[1] - a[1])
          const dominant = sorted[0]?.[0] || null
          if (dominant) vark = { dominant_style: dominant, visual_score: 0, auditory_score: 0, reading_score: 0, kinesthetic_score: 0, secondary_style: null }
        }
      }

      // Provide a neutral VARK object if still not found to avoid nulls in client
      if (!vark) vark = { dominant_style: null, visual_score: 0, auditory_score: 0, reading_score: 0, kinesthetic_score: 0, secondary_style: null }

      // If mastery records are empty, synthesize a single Overall topic entry
      if ((!mastery || mastery.length === 0) && typeof overallMastery === 'number') {
        mastery = [{ concept_id: null, learning_concepts: { name: 'Overall' }, mastery_score: overallMastery, assessment_count: 0, last_updated: sp.updated_at || sp.created_at || null }]
      }

      const enrolled = (enrollments || []).map((e: any) => ({
        classId: e.class_id || e.classes?.id,
        classCode: e.class_code || e.classes?.class_code,
        className: e.classes?.class_name || 'Unknown Class',
        teacherId: e.classes?.teacher_id || null,
        subject: e.classes?.subject || null,
        enrolledAt: e.created_at || null,
      }))

      const masteryByTopic = (mastery || []).map((m: any) => ({
        topicId: m.concept_id,
        topicName: m.learning_concepts?.name || 'Unknown Topic',
        score: m.mastery_score || 0,
        assessmentCount: m.assessment_count || 0,
        lastUpdated: m.last_updated || m.created_at || null,
      }))

      const recentActivity = (activity || []).map((a: any) => ({
        id: a.id,
        type: a.activity_type,
        description: a.activity_description,
        timestamp: a.timestamp,
        durationMinutes: a.duration_minutes,
      }))

      // Simple recommendations derived server-side
      const recommendations: string[] = []
      if (engagementLevel < 40) recommendations.push('Encourage regular study sessions - even 15 minutes daily helps!')
      if (overallMastery < 50) recommendations.push('Consider reviewing weak topics together or arranging additional practice.')
      const dom = (vark && (vark.dominant_style || vark.dominantStyle)) || null
      if (dom) {
        const lowered = String(dom).toLowerCase()
        if (lowered === 'visual') recommendations.push('Use diagrams, charts, and videos when helping with homework.')
        else if (lowered === 'auditory') recommendations.push('Discuss concepts out loud and consider educational podcasts.')
        else if (lowered === 'reading') recommendations.push('Provide books and written materials for extra learning.')
        else if (lowered === 'kinesthetic') recommendations.push('Use hands-on activities and real-world examples when studying.')
      }

      children.push({
        id: sp.id,
        userId: sp.user_id,
        name,
        email: u?.email || null,
        overallMastery,
        engagementIndex,
        engagementLevel,
        engagementStatus,
        varkProfile: vark || null,
        enrolledClasses: enrolled,
        masteryByTopic,
        recentActivity,
        recommendations: recommendations.slice(0, 3),
      })
    }

    return NextResponse.json({ children })
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('parent children API error', e)
    return NextResponse.json({ children: [] })
  }
}
