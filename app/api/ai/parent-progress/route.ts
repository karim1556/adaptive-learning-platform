import { NextRequest, NextResponse } from "next/server"
import getAdminSupabaseClient from "@/lib/server/admin-supabase"
import { buildMailtoUrl, buildWeeklyProgressSnapshot, type ProgressSnapshotInput } from "@/lib/progress-sharing"
import { getStudentInsight } from "@/lib/server/student-insights"

async function sendViaResend(to: string, subject: string, html: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.PARENT_PROGRESS_FROM_EMAIL

  if (!apiKey || !from) return { delivered: false }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || "Resend delivery failed")
  }

  return { delivered: true }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parentEmail = String(body?.parentEmail || "").trim()
    const parentName = String(body?.parentName || "").trim()
    const studentId = String(body?.studentId || "").trim()
    const providedSnapshot = body?.studentSnapshot as ProgressSnapshotInput | undefined

    if (!parentEmail) {
      return NextResponse.json({ error: "Parent email is required" }, { status: 400 })
    }

    let snapshotInput = providedSnapshot

    const adminClient = getAdminSupabaseClient()
    if (!snapshotInput && adminClient && studentId) {
      try {
        const studentInsight = await getStudentInsight(adminClient, { userId: studentId })

        if (studentInsight) {
          snapshotInput = {
            studentName: studentInsight.name,
            parentName,
            parentEmail,
            overallMastery: studentInsight.overallMastery,
            engagementLevel: studentInsight.engagementIndex,
            dominantStyle: studentInsight.varkProfile.dominantStyle || undefined,
            masteryByTopic: studentInsight.masteryByTopic.map((item) => ({
              topicName: item.topicName,
              score: item.score,
            })),
            badges: studentInsight.badges.filter((badge) => badge.earned).map((badge) => ({ name: badge.name })),
            recentActivity: studentInsight.recentActivity.map((activity) => ({
              description: activity.description,
              timestamp: activity.timestamp,
            })),
          }
        }
      } catch (error) {
        console.error("Failed to hydrate snapshot from service role:", error)
      }
    }

    if (!snapshotInput) {
      return NextResponse.json({ error: "Student snapshot data is required" }, { status: 400 })
    }

    const snapshot = buildWeeklyProgressSnapshot({
      ...snapshotInput,
      parentEmail,
      parentName,
    })

    let deliveryStatus: "sent" | "drafted" = "drafted"
    try {
      const delivery = await sendViaResend(parentEmail, snapshot.subject, snapshot.htmlBody, snapshot.textBody)
      if (delivery.delivered) {
        deliveryStatus = "sent"
      }
    } catch (error) {
      console.error("Progress share email delivery fell back to mailto:", error)
    }

    const mailtoUrl = buildMailtoUrl(parentEmail, snapshot.subject, snapshot.textBody)

    if (adminClient && studentId) {
      try {
        await adminClient.from("parent_progress_shares").insert({
          student_id: studentId,
          parent_email: parentEmail,
          parent_name: parentName || null,
          delivery_status: deliveryStatus,
          subject: snapshot.subject,
          snapshot: {
            summary: snapshot.summary,
            highlights: snapshot.highlights,
            strengths: snapshot.strengths,
            focusAreas: snapshot.focusAreas,
          },
          sent_at: deliveryStatus === "sent" ? new Date().toISOString() : null,
        })
      } catch (error) {
        console.error("Failed to log parent progress share:", error)
      }
    }

    return NextResponse.json({
      deliveryStatus,
      subject: snapshot.subject,
      summary: snapshot.summary,
      highlights: snapshot.highlights,
      textBody: snapshot.textBody,
      htmlBody: snapshot.htmlBody,
      mailtoUrl,
    })
  } catch (error) {
    console.error("Parent progress share error:", error)
    return NextResponse.json({ error: "Failed to build parent progress snapshot" }, { status: 500 })
  }
}
