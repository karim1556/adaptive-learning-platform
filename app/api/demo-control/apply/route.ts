import { NextRequest, NextResponse } from "next/server"
import { applyDemoOverrides, getDemoControlMeta, validateDemoAdminKey, type DemoOverrideInput } from "@/lib/server/demo-control"

export async function POST(request: NextRequest) {
  try {
    const key = request.headers.get("x-demo-admin-key")
    if (!validateDemoAdminKey(key)) {
      return NextResponse.json({ error: "Unauthorized", ...getDemoControlMeta() }, { status: 401 })
    }

    const body = (await request.json()) as DemoOverrideInput
    const student = await applyDemoOverrides(body)
    return NextResponse.json({ student })
  } catch (error: any) {
    console.error("Demo control apply failed:", error)
    return NextResponse.json({ error: error?.message || "Unable to apply demo values" }, { status: 500 })
  }
}
