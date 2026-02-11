/**
 * Learning Style AI Service
 * 
 * Handles AI-powered tutoring adapted to different VARK learning styles:
 * - Reading: Simple, concise text explanations
 * - Visual: Diagram generation with explanatory text
 * - Auditory: Voice-based explanations using ElevenLabs
 * - Kinesthetic: Hands-on labs and interactive resources
 */

import OpenAI from 'openai'

// Types
export type LearningStyle = 'reading' | 'visual' | 'auditory' | 'kinesthetic'

export interface AIResponse {
  type: LearningStyle
  content: string
  diagram?: DiagramData
  audio?: AudioData
  labs?: LabResource[]
  metadata?: Record<string, any>
}

export interface DiagramData {
  type: 'mermaid' | 'svg' | 'image'
  code?: string  // For Mermaid diagrams
  url?: string   // For generated images
  alt: string
}

export interface AudioData {
  url?: string
  text: string
  voiceId?: string
  duration?: number
}

export interface LabResource {
  title: string
  url: string
  provider: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  duration?: string
}

export interface StudentContext {
  studentName: string
  dominantLearningStyle: string
  secondaryStyle?: string
  currentTopic?: string
  masteryLevel: number
  grade?: number
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[]
}

// Initialize OpenAI client (works with both OpenAI and Groq)
function getOpenAIClient() {
  // Prefer Groq for faster responses, fallback to OpenAI
  if (process.env.GROQ_API_KEY) {
    return new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    })
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

// Get the appropriate model based on the client
function getModel() {
  if (process.env.GROQ_API_KEY) {
    return 'llama-3.3-70b-versatile'
  }
  return 'gpt-4o-mini'
}

/**
 * Generate a Reading-style response (simple, clear text)
 */
export async function generateReadingResponse(
  query: string,
  context: StudentContext
): Promise<AIResponse> {
  const client = getOpenAIClient()
  const grade = context.grade || 7

  const systemPrompt = `You are a helpful AI tutor specialized in explaining concepts through clear, concise text.

RULES:
1. Keep explanations SHORT and SIMPLE - suitable for Grade ${grade} students
2. Use bullet points and numbered lists for clarity
3. Define any technical terms in simple words
4. Include one brief example when helpful
5. End with a quick summary or key takeaway
6. Maximum 200 words per response
7. Use clear paragraph breaks
8. If the student asks something off-topic, gently redirect to learning

Student: ${context.studentName}
Current Mastery Level: ${context.masteryLevel}%
Topic Focus: ${context.currentTopic || 'General'}

Respond in a friendly but educational tone.`

  try {
    const historyMessages = (context.conversationHistory || []).map(h => ({ role: h.role, content: h.content }))
    const messages = [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      { role: 'user', content: query },
    ]

    const completion = await client.chat.completions.create({
      model: getModel(),
      messages: messages as any,
      max_tokens: 500,
      temperature: 0.7,
    })

    const content = completion.choices[0]?.message?.content || 'I apologize, I could not generate a response. Please try again.'

    return {
      type: 'reading',
      content,
    }
  } catch (error) {
    console.error('Reading AI Error:', error)
    return {
      type: 'reading',
      content: `I'm having trouble connecting right now. Here's a tip for your question about "${query}": Try breaking down the concept into smaller parts and understanding each one step by step.`,
    }
  }
}

/**
 * Detect if a query requires a complex multi-part diagram
 */
function isComplexVisualRequest(query: string): boolean {
  const complexKeywords = [
    'periodic table', 'all elements', 'complete', 'entire', 'full',
    'every', 'list all', 'show all', 'classification', 'taxonomy',
    'all types', 'comprehensive', 'detailed', 'everything about',
    'all the', 'complete list', 'breakdown of all'
  ]
  const lowerQuery = query.toLowerCase()
  return complexKeywords.some(kw => lowerQuery.includes(kw))
}

/**
 * Generate a Visual-style response with Mermaid diagrams
 * Handles both simple and complex diagram requests
 */
export async function generateVisualResponse(
  query: string,
  context: StudentContext
): Promise<AIResponse> {
  const client = getOpenAIClient()
  const grade = context.grade || 7
  const isComplex = isComplexVisualRequest(query)

  const systemPrompt = isComplex 
    ? `You are an expert AI tutor who creates DETAILED, COMPREHENSIVE visual diagrams for complex topics.

RULES FOR COMPLEX DIAGRAMS:
1. ALWAYS include one or more Mermaid diagrams
2. For large topics (like periodic table, taxonomies, etc.), use MULTIPLE organized sections
3. Group related items together with clear subgraphs
4. Use color styling to differentiate categories
5. Include a brief explanation (150 words max) summarizing the visual

DIAGRAM STRATEGIES FOR COMPLEX TOPICS:

**For Periodic Table / Classifications:**
Use flowchart with subgraphs to group categories:
\`\`\`mermaid
flowchart TB
    subgraph Alkali["🔴 Alkali Metals"]
        Li[Li<br/>Lithium<br/>3]
        Na[Na<br/>Sodium<br/>11]
        K[K<br/>Potassium<br/>19]
    end
    subgraph Alkaline["🟠 Alkaline Earth"]
        Be[Be<br/>Beryllium<br/>4]
        Mg[Mg<br/>Magnesium<br/>12]
        Ca[Ca<br/>Calcium<br/>20]
    end
    subgraph Halogens["🟢 Halogens"]
        F[F<br/>Fluorine<br/>9]
        Cl[Cl<br/>Chlorine<br/>17]
        Br[Br<br/>Bromine<br/>35]
    end
    subgraph Noble["🔵 Noble Gases"]
        He[He<br/>Helium<br/>2]
        Ne[Ne<br/>Neon<br/>10]
        Ar[Ar<br/>Argon<br/>18]
    end
    
    style Alkali fill:#ff6b6b,color:#fff
    style Alkaline fill:#ffa94d,color:#fff
    style Halogens fill:#51cf66,color:#fff
    style Noble fill:#339af0,color:#fff
\`\`\`

**For Hierarchies / Taxonomies:**
Use mindmap with multiple branches:
\`\`\`mermaid
mindmap
  root((Topic))
    Category A
      Item 1
      Item 2
      Item 3
    Category B
      Item 4
      Item 5
    Category C
      Item 6
      Item 7
\`\`\`

**For Large Processes:**
Use flowchart TD with grouped stages

IMPORTANT:
- You CAN include up to 30-40 nodes for complex topics
- Use line breaks (<br/>) in nodes for multi-line content
- Add styling with colors to make categories clear
- If topic is VERY large (like ALL periodic elements), focus on the most important groups/categories with examples from each
- Always mention if showing a representative sample

Student: ${context.studentName}
Mastery Level: ${context.masteryLevel}%
Topic: ${context.currentTopic || 'General'}`

    : `You are a helpful AI tutor who explains concepts using visual diagrams and structured text.

RULES:
1. ALWAYS include a Mermaid diagram to visualize the concept
2. Keep text explanation brief (100 words max before/after diagram)
3. Use the diagram to show relationships, processes, or hierarchies
4. Make diagrams simple and clear for Grade ${grade} students
5. Explain what the diagram shows

DIAGRAM FORMAT:
You MUST include a Mermaid diagram wrapped in \`\`\`mermaid code blocks.

Choose the appropriate diagram type:
- flowchart TD for processes/steps
- flowchart LR for left-to-right relationships
- mindmap for topic breakdowns
- sequenceDiagram for interactions
- pie for proportions

Example flowchart:
\`\`\`mermaid
flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
\`\`\`

Example mindmap:
\`\`\`mermaid
mindmap
  root((Main Concept))
    Branch 1
      Detail A
      Detail B
    Branch 2
      Detail C
      Detail D
\`\`\`

Student: ${context.studentName}
Mastery Level: ${context.masteryLevel}%
Topic: ${context.currentTopic || 'General'}

Keep diagrams clear with 8-15 nodes for good readability.`

  try {
    // Build messages including conversation history if available
    const historyMessages = (context.conversationHistory || []).map(h => ({ role: h.role, content: h.content }))
    const messages = [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      { role: 'user', content: query },
    ]

    const completion = await client.chat.completions.create({
      model: getModel(),
      messages: messages as any,
      max_tokens: isComplex ? 2000 : 1000,
      temperature: 0.7,
    })

    const fullContent = completion.choices[0]?.message?.content || ''
    
    // Extract ALL Mermaid diagrams from response (support multiple diagrams)
    const mermaidMatches = fullContent.matchAll(/```mermaid\n([\s\S]*?)```/g)
    const diagrams: string[] = []
    
    for (const match of mermaidMatches) {
      diagrams.push(match[1].trim())
    }
    
    let diagram: DiagramData | undefined
    let textContent = fullContent

    if (diagrams.length > 0) {
      // Combine multiple diagrams or use single diagram
      diagram = {
        type: 'mermaid',
        code: diagrams[0], // Primary diagram (UI can be extended to show multiple)
        alt: `Diagram explaining: ${query.slice(0, 50)}`,
      }
      // Remove all mermaid blocks from text content for clean display
      textContent = fullContent.replace(/```mermaid\n[\s\S]*?```/g, '[DIAGRAM]').trim()
    }

    return {
      type: 'visual',
      content: textContent,
      diagram,
    }
  } catch (error) {
    console.error('Visual AI Error:', error)
    
    // Better fallback diagram for complex topics
    const fallbackDiagram = isComplex 
      ? `flowchart TB
    subgraph Main["📚 ${context.currentTopic || query.slice(0, 30)}"]
        A[Category 1] --> A1[Example 1]
        A --> A2[Example 2]
        B[Category 2] --> B1[Example 3]
        B --> B2[Example 4]
        C[Category 3] --> C1[Example 5]
        C --> C2[Example 6]
    end
    
    style Main fill:#e3f2fd,stroke:#1976d2`
      : `flowchart TD
    A[${context.currentTopic || 'Concept'}] --> B[Key Point 1]
    A --> C[Key Point 2]
    A --> D[Key Point 3]
    B --> E[Practice & Apply]
    C --> E
    D --> E`
    
    return {
      type: 'visual',
      content: `Let me visualize "${query}" for you. ${isComplex ? 'This is a complex topic, so I\'ve organized it into categories:' : ''}`,
      diagram: {
        type: 'mermaid',
        code: fallbackDiagram,
        alt: 'Concept visualization diagram',
      },
    }
  }
}

/**
 * Generate text for Auditory response (to be converted to speech)
 */
export async function generateAuditoryText(
  query: string,
  context: StudentContext
): Promise<string> {
  const client = getOpenAIClient()
  const grade = context.grade || 7

  const systemPrompt = `You are a friendly AI tutor explaining concepts in a conversational way. Your response will be spoken aloud.

RULES FOR NATURAL SPEECH:
1. Write in a CONVERSATIONAL style like talking to a friend
2. Use natural, clear expressions:
   - "Let me explain this simply"
   - "Think of it this way"
   - "Here's what you need to know"
   - "That's a great question"
3. Use natural pauses with commas for smooth flow
4. Avoid bullet points - write flowing paragraphs
5. Use relatable examples and analogies
6. Keep responses to 120-150 words (about 1 minute of speech)
7. Use simple, everyday vocabulary suitable for Grade ${grade}
8. Be encouraging: "Great!", "You're doing well!", "Excellent!"
9. End with positive motivation

Student: ${context.studentName}
Mastery Level: ${context.masteryLevel}%
Topic: ${context.currentTopic || 'General'}

Remember: Speak naturally and clearly like a friendly teacher!`

  try {
    const historyMessages = (context.conversationHistory || []).map(h => ({ role: h.role, content: h.content }))
    const messages = [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      { role: 'user', content: query },
    ]

    const completion = await client.chat.completions.create({
      model: getModel(),
      messages: messages as any,
      max_tokens: 400,
      temperature: 0.8,
    })

    return completion.choices[0]?.message?.content || `Let me explain ${query} in a simple way. ${context.currentTopic ? `This relates to ${context.currentTopic}.` : ''} Think of it step by step, and don't hesitate to ask questions!`
  } catch (error) {
    console.error('Auditory Text Error:', error)
    return `Let me explain this concept about ${query}. The key thing to understand is that learning happens best when we break things down into smaller pieces. Keep practicing and you'll get it!`
  }
}

/**
 * Generate audio using ElevenLabs Text-to-Speech
 */
export async function generateAudioResponse(
  query: string,
  context: StudentContext
): Promise<AIResponse> {
  // First, generate the spoken text
  const spokenText = await generateAuditoryText(query, context)

  return {
    type: 'auditory',
    content: spokenText,
    audio: {
      text: spokenText,
      voiceId: 'pFZP5JQG7iQjIQuC4Bku', // Natural, friendly voice
    },
  }
}

/**
 * Search for hands-on labs and interactive resources
 */
export async function generateKinestheticResponse(
  query: string,
  context: StudentContext
): Promise<AIResponse> {
  const client = getOpenAIClient()
  const grade = context.grade || 7

  // Generate explanation with hands-on activities
  const systemPrompt = `You are a hands-on learning specialist who helps students learn by DOING.

RULES:
1. Suggest 2-3 PRACTICAL activities the student can do
2. Include step-by-step instructions for each activity
3. Use household items or easily accessible materials
4. Connect activities to real-world applications
5. Keep explanations brief - focus on ACTION
6. Include a simple experiment or project when possible
7. Suitable for Grade ${grade} students

FORMAT your response like this:
1. Brief concept explanation (2-3 sentences)
2. HANDS-ON ACTIVITY 1: [Title]
   - Materials needed
   - Steps to follow
   - What to observe
3. HANDS-ON ACTIVITY 2: [Title]
   - Similar format

Student: ${context.studentName}
Mastery Level: ${context.masteryLevel}%
Topic: ${context.currentTopic || 'General'}`

  try {
    const historyMessages = (context.conversationHistory || []).map(h => ({ role: h.role, content: h.content }))
    const messages = [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      { role: 'user', content: query },
    ]

    const completion = await client.chat.completions.create({
      model: getModel(),
      messages: messages as any,
      max_tokens: 600,
      temperature: 0.7,
    })

    const content = completion.choices[0]?.message?.content || ''

    // Search for relevant online labs based on the topic
    const labs = await searchOnlineLabs(query, context.currentTopic || query, grade)

    return {
      type: 'kinesthetic',
      content,
      labs,
    }
  } catch (error) {
    console.error('Kinesthetic AI Error:', error)
    return {
      type: 'kinesthetic',
      content: `Let's learn "${query}" by doing! Here's a hands-on activity:

**Activity: Explore and Discover**
1. Take a piece of paper and write down what you already know
2. Draw or build a simple model related to the concept
3. Explain it to someone else or record yourself explaining
4. Try to find a real-world example around you

The best way to learn is by getting hands-on experience!`,
      labs: [],
    }
  }
}

/**
 * Search for online labs and interactive resources
 */
async function searchOnlineLabs(query: string, topic: string, grade: number): Promise<LabResource[]> {
  // Curated list of educational lab platforms with search capabilities
  const labProviders = [
    {
      name: 'PhET Interactive Simulations',
      baseUrl: 'https://phet.colorado.edu',
      searchUrl: (q: string) => `https://phet.colorado.edu/en/simulations/filter?subjects=all&type=html&sort=alpha&view=grid&q=${encodeURIComponent(q)}`,
      description: 'Free interactive science and math simulations'
    },
    {
      name: 'Khan Academy Labs',
      baseUrl: 'https://www.khanacademy.org',
      searchUrl: (q: string) => `https://www.khanacademy.org/search?referer=%2F&page_search_query=${encodeURIComponent(q)}`,
      description: 'Interactive exercises and practice problems'
    },
    {
      name: 'Labster Virtual Labs',
      baseUrl: 'https://www.labster.com',
      searchUrl: (q: string) => `https://www.labster.com/simulations?search=${encodeURIComponent(q)}`,
      description: 'Virtual laboratory experiments'
    },
    {
      name: 'CK-12 Simulations',
      baseUrl: 'https://www.ck12.org',
      searchUrl: (q: string) => `https://www.ck12.org/search/?q=${encodeURIComponent(q)}&pageNum=1&resourceTypes=simulation`,
      description: 'Free interactive simulations and activities'
    },
    {
      name: 'Explore Learning Gizmos',
      baseUrl: 'https://www.explorelearning.com',
      searchUrl: (q: string) => `https://www.explorelearning.com/gizmos?search=${encodeURIComponent(q)}`,
      description: 'Math and science virtual labs'
    },
  ]

  // Generate relevant lab links
  const labs: LabResource[] = labProviders.slice(0, 3).map(provider => ({
    title: `${provider.name} - ${topic}`,
    url: provider.searchUrl(topic),
    provider: provider.name,
    description: provider.description,
    difficulty: grade <= 6 ? 'beginner' : grade <= 9 ? 'intermediate' : 'advanced',
    duration: '15-30 mins',
  }))

  return labs
}

/**
 * Main function to generate AI response based on learning style
 */
export async function generateStyledAIResponse(
  query: string,
  style: LearningStyle,
  context: StudentContext
): Promise<AIResponse> {
  switch (style) {
    case 'reading':
      return generateReadingResponse(query, context)
    case 'visual':
      return generateVisualResponse(query, context)
    case 'auditory':
      return generateAudioResponse(query, context)
    case 'kinesthetic':
      return generateKinestheticResponse(query, context)
    default:
      return generateReadingResponse(query, context)
  }
}
