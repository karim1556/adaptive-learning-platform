import { NextRequest, NextResponse } from 'next/server'
import { generateStyledAIResponse, type LearningStyle, type StudentContext } from '@/lib/ai/learning-style-ai'

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

    const defaultContext: StudentContext = {
      studentName: 'Student',
      dominantLearningStyle: style,
      masteryLevel: 50,
      grade: 7,
      ...context,
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
