import { NextRequest, NextResponse } from "next/server"
import { getFallbackResourceRecommendations, buildResourceSelectionPrompt, varkResourceLibrary } from "@/lib/vark-resource-linker"
import { getModel, getOpenAIClient } from "@/lib/ai/learning-style-ai"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const topic = String(body?.topic || "").trim()
    const dominantStyle = String(body?.dominantStyle || "").trim().toLowerCase()
    const secondaryStyle = String(body?.secondaryStyle || "").trim().toLowerCase()
    const masteryLevel = Number(body?.masteryLevel || 0)
    const limit = Math.max(2, Math.min(3, Number(body?.limit || 3)))

    if (!topic) {
      return NextResponse.json({ error: "Missing topic" }, { status: 400 })
    }

    let resources = getFallbackResourceRecommendations(
      { topic, dominantStyle, secondaryStyle, masteryLevel },
      limit,
    )

    if (process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY) {
      try {
        const client = getOpenAIClient()
        const completion = await client.chat.completions.create({
          model: getModel(),
          messages: [
            {
              role: "system",
              content: "You are selecting free study resources for a student. Prefer topic relevance first, then VARK alignment. Return JSON only.",
            },
            {
              role: "user",
              content: buildResourceSelectionPrompt({ topic, dominantStyle, secondaryStyle, masteryLevel }, limit),
            },
          ] as any,
          temperature: 0.2,
          max_tokens: 350,
        })

        const raw = completion.choices[0]?.message?.content || ""
        const parsed = JSON.parse(raw)
        const selected = Array.isArray(parsed?.recommendations) ? parsed.recommendations : []
        const aiResources = selected
          .map((item: any) => {
            const resource = varkResourceLibrary.find((entry) => entry.id === item.id)
            if (!resource) return null
            return {
              ...resource,
              reason: item.reason,
            }
          })
          .filter(Boolean)

        if (aiResources.length > 0) {
          resources = aiResources.slice(0, limit) as any
        }
      } catch (error) {
        console.error("AI resource linker fallback used:", error)
      }
    }

    return NextResponse.json({
      resources: resources.map((resource) => ({
        ...resource,
        reason:
          (resource as any).reason ||
          `Strong fit for ${dominantStyle || "your"} learning with useful support for ${topic}.`,
      })),
      message: `Here are ${resources.length} free resources matched to ${topic}.`,
    })
  } catch (error) {
    console.error("Resource linker error:", error)
    return NextResponse.json({ error: "Failed to recommend resources" }, { status: 500 })
  }
}
