import { NextRequest, NextResponse } from 'next/server'

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET
const LIVEKIT_URL = process.env.LIVEKIT_URL

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, sessionType = 'tutoring' } = body

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
      return NextResponse.json(
        { error: 'LiveKit credentials not configured' },
        { status: 500 }
      )
    }

    // Generate a unique room name for the tutoring session
    const roomName = `tutor-${studentId}-${Date.now()}`

    // For now, return the configuration needed for client-side setup
    // In production, you would generate a proper LiveKit access token here
    return NextResponse.json({
      success: true,
      room: roomName,
      url: LIVEKIT_URL,
      sessionType,
      message: 'LiveKit session ready for voice tutoring',
    })
  } catch (error) {
    console.error('LiveKit API Error:', error)
    return NextResponse.json(
      { error: 'Failed to create voice session' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    available: !!(LIVEKIT_API_KEY && LIVEKIT_API_SECRET && LIVEKIT_URL),
    url: LIVEKIT_URL || null,
  })
}
