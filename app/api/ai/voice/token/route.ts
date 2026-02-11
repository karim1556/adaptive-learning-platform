import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET
const LIVEKIT_URL = process.env.LIVEKIT_URL

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { participantName, roomName, studentId } = body

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      return NextResponse.json(
        { error: 'LiveKit credentials not configured' },
        { status: 500 }
      )
    }

    // Generate unique room name if not provided
    const room = roomName || `tutor-${studentId || 'session'}-${Date.now()}`
    const participant = participantName || `student-${studentId || Date.now()}`

    // Create access token for the participant
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: participant,
      name: participantName || 'Student',
      ttl: '1h', // Token valid for 1 hour
    })

    // Grant permissions for the room
    at.addGrant({
      roomJoin: true,
      room: room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    })

    const token = await at.toJwt()

    return NextResponse.json({
      success: true,
      token,
      room,
      url: LIVEKIT_URL?.replace('wss://', 'https://').replace(':443', '') || '',
      wsUrl: LIVEKIT_URL,
    })
  } catch (error) {
    console.error('LiveKit Token Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate token' },
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
