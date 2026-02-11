import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const GROQ_API_KEY = process.env.GROQ_API_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

// Get OpenAI client (prefer Groq for speed)
function getOpenAIClient() {
  if (GROQ_API_KEY) {
    return new OpenAI({
      apiKey: GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    })
  }
  return new OpenAI({ apiKey: OPENAI_API_KEY })
}

function getModel() {
  return GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini'
}

// Transcribe audio using Deepgram
async function transcribeAudio(audioData: string): Promise<string> {
  if (!DEEPGRAM_API_KEY) {
    throw new Error('Deepgram API key not configured')
  }

  // Convert base64 to buffer
  const audioBuffer = Buffer.from(audioData.replace(/^data:audio\/\w+;base64,/, ''), 'base64')

  const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${DEEPGRAM_API_KEY}`,
      'Content-Type': 'audio/webm',
    },
    body: audioBuffer,
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Deepgram error:', error)
    throw new Error('Failed to transcribe audio')
  }

  const result = await response.json()
  return result.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''
}

// Generate AI response
async function generateResponse(
  transcript: string,
  context: {
    studentName: string
    topic?: string
    mastery?: number
    conversationHistory?: Array<{ role: string; content: string }>
    language?: string
  }
): Promise<string> {
  const client = getOpenAIClient()

  const language = context.language || 'english'
  
  const systemPrompt = language === 'hindi' 
    ? `आप एक मित्रवत AI शिक्षक हैं जो ${context.studentName} नामक छात्र के साथ आवाज़ में बातचीत कर रहे हैं।

महत्वपूर्ण नियम:
1. जवाब छोटे रखें - अधिकतम 2-3 वाक्य (यह वास्तविक समय की बातचीत है)
2. बहुत सरल और स्पष्ट भाषा में समझाएं
3. प्रोत्साहन दें: "बहुत अच्छे!", "शाबाश!", "बिल्कुल सही!"
4. उदाहरण देकर समझाएं
5. अगर नहीं समझ आया तो स्पष्टीकरण मांगें

विषय: ${context.topic || 'सामान्य शिक्षा'}
छात्र का स्तर: ${context.mastery || 50}%

याद रखें: आप एक मित्र की तरह बात कर रहे हैं, निबंध नहीं लिख रहे!`
    : `You are a friendly AI tutor having a natural voice conversation with a student named ${context.studentName}.

IMPORTANT RULES FOR NATURAL CONVERSATION:
1. Keep responses SHORT - 2-3 sentences max (this is real-time voice chat)
2. Be conversational and natural - speak like a friendly teacher
3. Pause naturally with commas for smooth flow
4. Be encouraging: "Great question!", "You're doing well!", "Exactly!"
5. Explain concepts simply and clearly
6. Ask follow-up questions to keep them engaged
7. Use relatable examples when explaining

Current topic: ${context.topic || 'General learning'}
Student mastery level: ${context.mastery || 50}%

Remember: You're TALKING to them naturally, keep it brief and clear!`

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ]

  // Add conversation history if available
  if (context.conversationHistory) {
    context.conversationHistory.forEach((msg) => {
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })
    })
  }

  messages.push({ role: 'user', content: transcript })

  const completion = await client.chat.completions.create({
    model: getModel(),
    messages,
    max_tokens: 150, // Keep responses short for voice
    temperature: 0.8,
  })

  return completion.choices[0]?.message?.content || "I'm sorry, I didn't catch that. Could you say that again?"
}

// Generate speech from text using ElevenLabs
async function generateSpeech(text: string, voiceId: string = 'pFZP5JQG7iQjIQuC4Bku', language: string = 'english'): Promise<string> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ElevenLabs API key not configured')
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
    {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: language === 'hindi' ? 'eleven_multilingual_v2' : 'eleven_turbo_v2_5',
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
    const error = await response.text()
    console.error('ElevenLabs error:', error)
    throw new Error('Failed to generate speech')
  }

  const audioBuffer = await response.arrayBuffer()
  return `data:audio/mpeg;base64,${Buffer.from(audioBuffer).toString('base64')}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { audio, text, context, action } = body

    // Action: transcribe - Convert speech to text
    if (action === 'transcribe' && audio) {
      const transcript = await transcribeAudio(audio)
      return NextResponse.json({ success: true, transcript })
    }

    // Action: respond - Get AI response and generate speech
    if (action === 'respond' && text) {
      const aiResponse = await generateResponse(text, context || {})
      
      let audioData = null
      try {
        audioData = await generateSpeech(aiResponse, 'pFZP5JQG7iQjIQuC4Bku', context.language || 'english')
      } catch (err) {
        console.error('Speech generation failed:', err)
      }

      return NextResponse.json({
        success: true,
        text: aiResponse,
        audio: audioData,
      })
    }

    // Full pipeline: transcribe + respond + speak
    if (audio) {
      const transcript = await transcribeAudio(audio)
      if (!transcript.trim()) {
        return NextResponse.json({
          success: false,
          error: 'Could not understand audio',
        })
      }

      const aiResponse = await generateResponse(transcript, context || {})
      
      let audioData = null
      try {
        audioData = await generateSpeech(aiResponse, 'pFZP5JQG7iQjIQuC4Bku', context.language || 'english')
      } catch (err) {
        console.error('Speech generation failed:', err)
      }

      return NextResponse.json({
        success: true,
        transcript,
        response: aiResponse,
        audio: audioData,
      })
    }

    return NextResponse.json(
      { error: 'Missing audio or text data' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Voice Process Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    deepgramAvailable: !!DEEPGRAM_API_KEY,
    elevenlabsAvailable: !!ELEVENLABS_API_KEY,
    aiAvailable: !!(GROQ_API_KEY || OPENAI_API_KEY),
  })
}
