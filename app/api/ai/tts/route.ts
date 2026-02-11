import { NextRequest, NextResponse } from 'next/server'

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY

// Voice IDs for ElevenLabs
const VOICES = {
  english_female: 'pFZP5JQG7iQjIQuC4Bku',  // Clear Indian accent English
  english_male: 'onwK4e9ZLuTAKqWW03F9',    // Indian accent English
  hindi_female: 'pFZP5JQG7iQjIQuC4Bku',    // Hindi female (same voice, different language)
  hindi_male: 'onwK4e9ZLuTAKqWW03F9',      // Hindi male
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, voiceId = VOICES.english_female } = body

    if (!text) {
      return NextResponse.json(
        { error: 'Missing required field: text' },
        { status: 400 }
      )
    }

    if (!ELEVENLABS_API_KEY) {
      // Return text-only response if no API key
      return NextResponse.json({
        success: false,
        text,
        error: 'ElevenLabs API key not configured',
      })
    }

    // Call ElevenLabs API with newer model (eleven_turbo_v2_5 for free tier)
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.65,
            similarity_boost: 0.85,
            style: 0.7,
            use_speaker_boost: true,
          },
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.text()
      console.error('ElevenLabs API Error:', errorData)
      return NextResponse.json({
        success: false,
        text,
        error: 'Failed to generate speech',
      })
    }

    // Get audio as array buffer
    const audioBuffer = await response.arrayBuffer()
    const audioBase64 = Buffer.from(audioBuffer).toString('base64')

    return NextResponse.json({
      success: true,
      text,
      audio: `data:audio/mpeg;base64,${audioBase64}`,
      duration: Math.ceil(text.split(' ').length / 2.5), // Rough estimate in seconds
    })
  } catch (error) {
    console.error('TTS API Error:', error)
    return NextResponse.json(
      { error: 'Failed to process text-to-speech request' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    available: !!ELEVENLABS_API_KEY,
    voices: VOICES,
  })
}
