import { NextRequest, NextResponse } from "next/server"
import {
  getDemoStudentDetail,
  getDemoStyleOptions,
  getDemoBadgeCatalog,
  getDemoControlMeta,
  listDemoStudentsWithFallback,
  validateDemoAdminKey,
} from "@/lib/server/demo-control"

export async function GET() {
  try {
    return NextResponse.json(getDemoControlMeta())
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unable to load demo control status" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const key = request.headers.get("x-demo-admin-key")
    if (!validateDemoAdminKey(key)) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          ...getDemoControlMeta(),
        },
        { status: 401 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const studentId = String(body?.studentId || "").trim()
    const search = String(body?.search || "").trim()

    if (studentId) {
      const student = await getDemoStudentDetail(studentId)
      return NextResponse.json({
        student,
        badgeCatalog: getDemoBadgeCatalog(),
        styleOptions: getDemoStyleOptions(),
      })
    }

    const students = await listDemoStudentsWithFallback(search)
    return NextResponse.json({
      students,
      badgeCatalog: getDemoBadgeCatalog(),
      styleOptions: getDemoStyleOptions(),
      ...getDemoControlMeta(),
    })
  } catch (error: any) {
    console.error("Demo control student lookup failed:", error)
    return NextResponse.json({ error: error?.message || "Unable to load students" }, { status: 500 })
  }
}
