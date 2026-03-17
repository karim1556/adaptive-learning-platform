import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"
import getAdminSupabaseClient from "@/lib/server/admin-supabase"
import { buildMailtoUrl, buildWeeklyProgressSnapshot, type ProgressSnapshotInput } from "@/lib/progress-sharing"
import { getStudentInsight } from "@/lib/server/student-insights"

function parseBoolean(value: string | undefined) {
  return value === "true" || value === "1" || value === "yes"
}

async function sendViaSmtp(to: string, subject: string, html: string, text: string) {
  const service = process.env.SMTP_SERVICE
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const secure = parseBoolean(process.env.SMTP_SECURE)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from =
    process.env.PARENT_PROGRESS_FROM_EMAIL ||
    process.env.SMTP_FROM_EMAIL ||
    user

  if (!from || !user || !pass || (!service && !host)) {
    return { delivered: false, provider: null as null | "smtp" }
  }

  const transporter = nodemailer.createTransport(
    service
      ? {
          service,
          auth: { user, pass },
        }
      : {
          host,
          port,
          secure,
          auth: { user, pass },
        },
  )

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
    text,
  })

  return { delivered: true, provider: "smtp" as const }
}

async function sendViaResend(to: string, subject: string, html: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.PARENT_PROGRESS_FROM_EMAIL || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER

  if (!apiKey || !from) return { delivered: false, provider: null as null | "resend" }

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

  return { delivered: true, provider: "resend" as const }
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
    let deliveryProvider: "smtp" | "resend" | "mailto" = "mailto"
    try {
      const smtpDelivery = await sendViaSmtp(parentEmail, snapshot.subject, snapshot.htmlBody, snapshot.textBody)

      let delivery = smtpDelivery
      if (!smtpDelivery.delivered) {
        delivery = await sendViaResend(parentEmail, snapshot.subject, snapshot.htmlBody, snapshot.textBody)
      }

      if (delivery.delivered) {
        deliveryStatus = "sent"
        deliveryProvider = delivery.provider || "smtp"
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
            deliveryProvider,
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
      deliveryProvider,
    })
  } catch (error) {
    console.error("Parent progress share error:", error)
    return NextResponse.json({ error: "Failed to build parent progress snapshot" }, { status: 500 })
  }
}
