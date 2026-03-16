import { NextRequest, NextResponse } from "next/server"
import getAdminSupabaseClient from "@/lib/server/admin-supabase"
import { getStudentInsight } from "@/lib/server/student-insights"

export async function POST(req: NextRequest) {
  try {
    const adminClient = getAdminSupabaseClient()
    if (!adminClient) {
      return NextResponse.json({ error: "Service key not configured", children: [] }, { status: 500 })
    }

    const body = await req.json()
    const userId = String(body?.userId || "").trim()
    const studentIdFilter = String(body?.studentId || "").trim()

    if (!userId) {
      return NextResponse.json({ children: [] })
    }

    let parentId: string | null = null
    const { data: parentByUser } = await adminClient
      .from("parent_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle()

    if (parentByUser?.id) {
      parentId = parentByUser.id
    } else {
      const { data: parentById } = await adminClient
        .from("parent_profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle()
      parentId = parentById?.id || null
    }

    if (!parentId) {
      return NextResponse.json({ children: [] })
    }

    let effectiveStudentFilter = studentIdFilter
    if (studentIdFilter) {
      const { data: byUser } = await adminClient
        .from("student_profiles")
        .select("id")
        .eq("user_id", studentIdFilter)
        .maybeSingle()

      if (byUser?.id) {
        effectiveStudentFilter = byUser.id
      }
    }

    let linkQuery = adminClient.from("parent_student").select("student_id").eq("parent_id", parentId)
    if (effectiveStudentFilter) {
      linkQuery = linkQuery.eq("student_id", effectiveStudentFilter)
    }

    const { data: links } = await linkQuery
    if (!links || links.length === 0) {
      return NextResponse.json({ children: [] })
    }

    const childResults = await Promise.all(
      links.map(async (link: { student_id: string }) => getStudentInsight(adminClient, { studentProfileId: link.student_id })),
    )

    return NextResponse.json({
      children: childResults.filter(Boolean),
    })
  } catch (error) {
    console.error("parent children API error", error)
    return NextResponse.json({ children: [] })
  }
}
