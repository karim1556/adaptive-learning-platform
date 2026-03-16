import { NextRequest, NextResponse } from 'next/server'
import { generateStyledAIResponse, type LearningStyle, type StudentContext } from '@/lib/ai/learning-style-ai'
import getAdminSupabaseClient from '@/lib/server/admin-supabase'

function extractCommonRequests(rows: Array<{ comment?: string | null }>) {
  const counts = new Map<string, number>()

  rows.forEach((row) => {
    const tokens = (row.comment || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 3)

    tokens.forEach((token) => counts.set(token, (counts.get(token) || 0) + 1))
  })

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([token]) => token)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, style, context } = body as {
      query: string
      style: LearningStyle
      context: StudentContext
    }

    if (!query || !style) {
      return NextResponse.json(
        { error: 'Missing required fields: query and style' },
        { status: 400 }
      )
    }

    let feedbackSummary = context.feedbackSummary
    const adminClient = getAdminSupabaseClient()

    if (adminClient && (context?.conceptId || context?.currentTopic)) {
      try {
        let query = adminClient.from('module_feedback').select('rating, comment, concept_name')

        if (context.conceptId) {
          query = query.eq('concept_id', context.conceptId)
        } else if (context.currentTopic) {
          query = query.ilike('concept_name', context.currentTopic)
        }

        const { data } = await query.limit(50)
        if (data && data.length > 0) {
          const averageRating = (
            data.reduce((sum: number, row: any) => sum + Number(row.rating || 0), 0) / data.length
          ).toFixed(1)
          const commonRequests = extractCommonRequests(data)
          feedbackSummary = `Recent feedback for ${data[0]?.concept_name || context.currentTopic || "this topic"} averages ${averageRating}/5 across ${data.length} responses. Common student requests: ${commonRequests.length > 0 ? commonRequests.join(", ") : "more examples and clearer breakdowns"}.`
        }
      } catch (error) {
        console.error('Module feedback aggregation failed:', error)
      }
    }

    const defaultContext: StudentContext = {
      ...context,
      studentName: context?.studentName || 'Student',
      dominantLearningStyle: context?.dominantLearningStyle || style,
      masteryLevel: context?.masteryLevel ?? 50,
      grade: context?.grade ?? 7,
      feedbackSummary,
    }

    const response = await generateStyledAIResponse(query, style, defaultContext)

    return NextResponse.json(response)
  } catch (error) {
    console.error('AI Chat API Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    )
  }
}
