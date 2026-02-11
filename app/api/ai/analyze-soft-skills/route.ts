import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Analyze uploaded file and description to extract likely soft skills
async function parseForm(req: NextRequest) {
  try {
    const form = await req.formData()
    const description = form.get('description')?.toString() || ''
    const studentId = form.get('studentId')?.toString() || ''
    const file = form.get('file') as File | null
    let fileName = ''
    let fileType = ''
    let fileBuffer: Buffer | null = null

    if (file && typeof file.arrayBuffer === 'function') {
      try {
        const buf = await file.arrayBuffer()
        fileBuffer = Buffer.from(buf)
        fileName = file.name || ''
        fileType = file.type || ''
      } catch (err) {
        console.warn('Failed to read uploaded file buffer', err)
      }
    }

    return { description, studentId, fileName, fileType, fileBuffer }
  } catch (err) {
    console.error('Form parse error', err)
    return { description: '', studentId: '', fileName: '', fileType: '', fileBuffer: null }
  }
}

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY || ''
  return new OpenAI({ apiKey })
}

// Extended soft skills list for better heuristic matching
const KNOWN_SOFT_SKILLS = [
  'teamwork', 'leadership', 'communication', 'problem solving', 'time management',
  'adaptability', 'creativity', 'presentation', 'collaboration', 'project management',
  'critical thinking', 'organization', 'public speaking', 'mentoring', 'initiative',
  'innovation', 'research', 'analytical thinking', 'decision making', 'networking',
  'negotiation', 'conflict resolution', 'empathy', 'emotional intelligence', 'resilience',
  'self-motivation', 'attention to detail', 'multitasking', 'flexibility', 'patience',
  'persistence', 'work ethic', 'professionalism', 'accountability', 'goal setting',
  'strategic thinking', 'planning', 'resourcefulness', 'interpersonal skills', 'listening'
]

function heuristicsFromText(text: string): string[] {
  const found = new Set<string>()
  const lower = text.toLowerCase()
  
  KNOWN_SOFT_SKILLS.forEach(skill => {
    const key = skill.toLowerCase()
    // Check for exact match or partial match (first word)
    if (lower.includes(key)) {
      found.add(skill)
    } else {
      // Check individual words for partial matches
      const words = key.split(' ')
      if (words.length > 1 && words.some(w => w.length > 4 && lower.includes(w))) {
        found.add(skill)
      }
    }
  })
  
  // Also infer skills from common keywords
  const keywordMap: Record<string, string[]> = {
    'hackathon': ['teamwork', 'problem solving', 'time management', 'creativity', 'collaboration'],
    'competition': ['problem solving', 'critical thinking', 'persistence', 'resilience'],
    'certificate': ['initiative', 'self-motivation', 'goal setting'],
    'course': ['initiative', 'self-motivation', 'adaptability'],
    'project': ['project management', 'planning', 'organization', 'problem solving'],
    'team': ['teamwork', 'collaboration', 'communication'],
    'lead': ['leadership', 'decision making', 'accountability'],
    'present': ['presentation', 'public speaking', 'communication'],
    'volunteer': ['empathy', 'initiative', 'interpersonal skills'],
    'intern': ['professionalism', 'adaptability', 'work ethic'],
    'award': ['initiative', 'persistence', 'goal setting'],
    'develop': ['creativity', 'problem solving', 'analytical thinking'],
    'code': ['problem solving', 'analytical thinking', 'attention to detail'],
    'app': ['creativity', 'problem solving', 'project management'],
    'design': ['creativity', 'attention to detail', 'problem solving'],
    'research': ['research', 'analytical thinking', 'critical thinking'],
    'workshop': ['initiative', 'adaptability', 'networking'],
    'mentor': ['mentoring', 'leadership', 'communication'],
    'collaborate': ['collaboration', 'teamwork', 'communication'],
    'document': ['organization', 'attention to detail', 'communication'],
  }
  
  Object.entries(keywordMap).forEach(([keyword, skills]) => {
    if (lower.includes(keyword)) {
      skills.forEach(s => found.add(s))
    }
  })
  
  return Array.from(found)
}

// Extract text from PDF using pdf-parse
async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require('pdf-parse')
    const fn = typeof pdfParse === 'function' ? pdfParse : pdfParse.default
    if (typeof fn === 'function') {
      const data = await fn(buffer)
      return data?.text || ''
    }
  } catch (err) {
    console.warn('pdf-parse failed:', err)
  }
  return ''
}

// Extract text from image using tesseract.js
async function extractImageText(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Tesseract = require('tesseract.js')
    const { data } = await Tesseract.recognize(buffer, 'eng', {
      logger: () => {} // suppress logging
    })
    return data?.text || ''
  } catch (err) {
    console.warn('Tesseract OCR failed:', err)
  }
  return ''
}

export async function POST(req: NextRequest) {
  try {
    const { description, studentId, fileName, fileType, fileBuffer } = await parseForm(req)
    const client = getClient()

    // Extract text from file if uploaded
    let extractedText = ''
    if (fileBuffer) {
      if (fileType?.startsWith('image/')) {
        extractedText = await extractImageText(fileBuffer)
        console.log('Image OCR extracted', extractedText.length, 'chars')
      } else if (fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
        extractedText = await extractPdfText(fileBuffer)
        console.log('PDF text extracted', extractedText.length, 'chars')
        
        // If PDF has no selectable text (scanned), just note it
        if (!extractedText.trim()) {
          console.log('PDF appears to be scanned (no selectable text). Using description + filename for analysis.')
        }
      }
    }

    // Log inputs for debugging
    console.log('analyze-soft-skills: description=', description.substring(0, 100), 'fileName=', fileName, 'extractedText length=', extractedText.length)

    // Build prompt - be more aggressive about extracting skills
    const combinedInput = `${description}\n${extractedText}\n${fileName}`.trim()
    
    const prompt = `Analyze this student achievement and extract ALL soft skills they likely developed. Be generous - if an activity could develop a skill, include it.

Student Input:
${combinedInput || '(No detailed description provided)'}

Return a JSON array of soft skill names. Examples: teamwork, leadership, communication, problem solving, time management, creativity, collaboration, critical thinking, adaptability, presentation, project management, initiative, persistence, organization.

If the input mentions any project, hackathon, certificate, course, competition, or achievement - they definitely developed skills like initiative, problem solving, and persistence at minimum.

Return ONLY a valid JSON array like: ["skill1", "skill2", "skill3"]`

    let skills: string[] = []

    try {
      const resp = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You extract soft skills from student achievements. Always return a JSON array. Be generous in identifying skills.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 300,
        temperature: 0.3,
      })

      const raw = resp.choices?.[0]?.message?.content || ''
      console.log('Model response:', raw)
      
      // Parse JSON from response
      const jsonMatch = raw.match(/\[[\s\S]*?\]/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (Array.isArray(parsed)) {
          skills = parsed.map((p: any) => String(p).trim()).filter(Boolean)
        }
      }
    } catch (err) {
      console.warn('Model call or parse failed:', err)
    }

    // Always run heuristics and merge with model results
    const heuristicSkills = heuristicsFromText(combinedInput)
    console.log('Heuristic skills:', heuristicSkills)
    
    // Merge and dedupe
    const allSkills = new Set([...skills, ...heuristicSkills])
    skills = Array.from(allSkills)

    // If still empty after everything, provide defaults for any upload
    if (skills.length === 0 && (fileBuffer || description)) {
      skills = ['initiative', 'self-motivation']
      console.log('Using default skills for non-empty input')
    }

    console.log('Final skills:', skills)
    return NextResponse.json({ success: true, skills, source: fileName ? 'file' : 'description' })
  } catch (error) {
    console.error('Analyze soft skills error', error)
    return NextResponse.json({ error: 'Failed to analyze' }, { status: 500 })
  }
}
