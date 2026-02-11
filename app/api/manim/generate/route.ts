import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import OpenAI from "openai"

const JOB_DIR = path.join(process.cwd(), "manim_jobs")

function ensureJobDir() {
  if (!fs.existsSync(JOB_DIR)) fs.mkdirSync(JOB_DIR, { recursive: true })
}

// Simple in-memory rate limiter: maps key -> array of timestamps (ms)
const rateMap = new Map<string, number[]>()
const RATE_LIMIT_MAX = 5 // requests
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // per minute

function getClientKey(request: NextRequest) {
  const xf = request.headers.get("x-forwarded-for")
  if (xf) return xf.split(",")[0].trim()
  const forwarded = request.headers.get("x-real-ip")
  if (forwarded) return forwarded
  return "unknown"
}

function isRateLimited(key: string) {
  const now = Date.now()
  const arr = rateMap.get(key) ?? []
  const windowStart = now - RATE_LIMIT_WINDOW_MS
  const filtered = arr.filter((t) => t > windowStart)
  filtered.push(now)
  rateMap.set(key, filtered)
  return filtered.length > RATE_LIMIT_MAX
}

function sanitizePrompt(prompt: string) {
  const lowered = prompt.toLowerCase()

  // NOTE:
  // This is not "perfect security" but reduces prompt injection attempts.
  // Your Manim code generator MUST still be sandboxed (docker / no network).
  const blacklist = [
    "import ",
    "from ",
    "subprocess",
    "os.",
    "sys.",
    "exec(",
    "eval(",
    "__import__",
    "socket",
    "requests",
    "urllib",
    "open(",
    "write(",
    "delete",
    "rm -rf",
    "curl",
    "wget",
  ]

  for (const b of blacklist) {
    if (lowered.includes(b)) {
      return { ok: false, reason: `Forbidden token: ${b.trim()}` }
    }
  }

  if (prompt.length > 1000) return { ok: false, reason: "Prompt too long (max 1000 chars)" }
  return { ok: true }
}

function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

// Preset scene specifications to use when prompt matches common topics.
const PRESETS: Record<string, any> = {
  dfa: {
    sceneType: "dfa",
    title: "DFA for strings ending with 01",
    params: {
      nodes: [
        { id: "q0", label: "q0", start: true },
        { id: "q1", label: "q1" },
        { id: "q2", label: "q2", accept: true }
      ],
      edges: [
        { from: "q0", to: "q1", label: "0" },
        { from: "q0", to: "q0", label: "1" },
        { from: "q1", to: "q1", label: "0" },
        { from: "q1", to: "q2", label: "1" },
        { from: "q2", to: "q1", label: "0" },
        { from: "q2", to: "q0", label: "1" }
      ]
    }
  },
  pythagoras: {
    sceneType: "triangle",
    title: "Pythagoras Theorem",
    params: {
      labels: { a: "a", b: "b", c: "c" },
      showRightAngle: true
    }
  },
  dbaas: {
    sceneType: "diagram",
    title: "DBaaS Architecture",
    params: {
      nodes: [
        { id: "client", label: "Client" },
        { id: "app", label: "Application" },
        { id: "db", label: "DBaaS Provider" }
      ],
      edges: [
        { from: "client", to: "app", label: "Uses API" },
        { from: "app", to: "db", label: "Managed DB Calls" },
        { from: "db", to: "app", label: "Responses" }
      ]
    }
  },
  dbms: {
    sceneType: "diagram",
    title: "DBMS Components",
    params: {
      nodes: [
        { id: "user", label: "User" },
        { id: "dbms", label: "DBMS" },
        { id: "storage", label: "Storage Engine" }
      ],
      edges: [
        { from: "user", to: "dbms", label: "Queries" },
        { from: "dbms", to: "storage", label: "Reads/Writes" }
      ]
    }
  },
  clientServer: {
    sceneType: "diagram",
    title: "Client-Server Architecture",
    params: {
      nodes: [
        { id: "client", label: "Client" },
        { id: "server", label: "Server" },
        { id: "db", label: "Database" }
      ],
      edges: [
        { from: "client", to: "server", label: "HTTP Request" },
        { from: "server", to: "client", label: "HTTP Response" },
        { from: "server", to: "db", label: "Query" },
        { from: "db", to: "server", label: "Result" }
      ]
    }
  }
}

function matchPreset(prompt: string) {
  const p = (prompt || "").toLowerCase()
  if (p.includes("dfa") || p.includes("automaton") || p.includes("finite automaton")) return PRESETS.dfa
  if (p.includes("pythag") || p.includes("pythagoras") || p.includes("triangle")) return PRESETS.pythagoras
  if (p.includes("dbaas") || p.includes("dbaas")) return PRESETS.dbaas
  if (p.includes("dbms") || (p.includes("database") && p.includes("management"))) return PRESETS.dbms
  if (p.includes("client server") || p.includes("client-server") || p.includes("clientserver") || p.includes("client server architecture")) return PRESETS.clientServer
  return null
}

/**
 * Removes code fences and trims output to improve JSON parsing success.
 */
function cleanModelOutputToJson(text: string) {
  if (!text) return ""
  return text
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim()
}

/**
 * Attempts to parse JSON strictly.
 * If fails, tries extracting first {...} block.
 */
function safeJsonParse(text: string) {
  const cleaned = cleanModelOutputToJson(text)

  try {
    return JSON.parse(cleaned)
  } catch (e) {
    // Attempt to extract JSON substring
    const m = cleaned.match(/\{[\s\S]*\}/)
    if (m) {
      try {
        return JSON.parse(m[0])
      } catch (e2) {
        return null
      }
    }
    return null
  }
}

/**
 * This is the upgraded prompt: it forces diagram-first thinking.
 * Works for ANY topic.
 */
function buildSceneSpecSystemPrompt() {
  return `You are an assistant that converts a user's prompt into a JSON scene specification for rendering with Manim.

IMPORTANT:
- Respond ONLY with a single valid JSON object.
- No markdown, no code fences, no explanations, no extra text.
- Prefer DIAGRAMMATIC / VISUAL explanations whenever possible.
- Use "text" ONLY when the prompt cannot be visualized.

SCHEMA:
{
  "sceneType": string,
  "title": string,
  "params": object
}

SUPPORTED sceneType values:
- "text"      : title + short content (minimal)
- "list"      : bullet list
- "diagram"   : generic labeled diagram (boxes + arrows)
- "dfa"       : automaton (nodes + edges)
- "triangle"  : geometry triangle
- "quadratic" : quadratic equation visualization
- "graph"     : coordinate axes + plotted function(s)

GENERAL RULES (diagram-first):
1) If prompt asks to "explain", "show", "visualize", "draw", "diagram"
   -> use "diagram" or "list" or a specialized sceneType.
2) If prompt contains keywords:
   - quadratic / parabola / x^2 / roots / vertex -> use "quadratic"
   - graph / plot / function / curve -> use "graph"
   - DFA / automata / finite automaton -> use "dfa"
   - triangle / pythagoras -> use "triangle"
3) If prompt is a process or algorithm -> use "list" with 4-8 steps.
4) Keep text short. Prefer labels, arrows, nodes, and structure.

PARAM SCHEMAS:

TEXT params:
{ "content": string }

LIST params:
{ "items": string[] }

DIAGRAM params:
{
  "nodes": { "id": string, "label": string }[],
  "edges": { "from": string, "to": string, "label"?: string }[]
}

DFA params:
{
  "nodes": { "id": string, "label": string, "start"?: boolean, "accept"?: boolean }[],
  "edges": { "from": string, "to": string, "label": string }[]
}

TRIANGLE params:
{
  "labels": { "a": string, "b": string, "c": string },
  "showRightAngle"?: boolean
}

QUADRATIC params:
{
  "a": number,
  "b": number,
  "c": number,
  "showFormula": boolean,
  "showGraph": boolean,
  "showRoots": boolean,
  "showVertex": boolean,
  "showAxisOfSymmetry": boolean,
  "notes": string[]
}

GRAPH params:
{
  "functions": { "expr": string, "label"?: string }[],
  "xRange": [number, number],
  "yRange": [number, number],
  "showAxes": boolean,
  "notes"?: string[]
}

DEFAULTS:
- If quadratic coefficients are not specified: a=1, b=-3, c=-4
- If graph ranges are not specified: xRange=[-6,6], yRange=[-6,6]
- Keep 1-2 functions max.

EXAMPLES:

User: "Explain quadratic equation"
JSON:
{"sceneType":"quadratic","title":"Quadratic Equation","params":{"a":1,"b":-3,"c":-4,"showFormula":true,"showGraph":true,"showRoots":true,"showVertex":true,"showAxisOfSymmetry":true,"notes":["General form: ax^2+bx+c=0","Roots via quadratic formula"]}}

User: "Show DFA for binary strings ending with 01"
JSON:
{"sceneType":"dfa","title":"DFA for strings ending with 01","params":{"nodes":[{"id":"q0","label":"q0","start":true},{"id":"q1","label":"q1"},{"id":"q2","label":"q2","accept":true}],"edges":[{"from":"q0","to":"q1","label":"0"},{"from":"q0","to":"q0","label":"1"},{"from":"q1","to":"q1","label":"0"},{"from":"q1","to":"q2","label":"1"},{"from":"q2","to":"q1","label":"0"},{"from":"q2","to":"q0","label":"1"}]}}

User: "Explain client server architecture"
JSON:
{"sceneType":"diagram","title":"Client-Server Architecture","params":{"nodes":[{"id":"client","label":"Client"},{"id":"server","label":"Server"},{"id":"db","label":"Database"}],"edges":[{"from":"client","to":"server","label":"HTTP Request"},{"from":"server","to":"client","label":"HTTP Response"},{"from":"server","to":"db","label":"Query"},{"from":"db","to":"server","label":"Result"}]}}

User: "Explain merge sort"
JSON:
{"sceneType":"list","title":"Merge Sort","params":{"items":["Split array into halves","Recursively sort left half","Recursively sort right half","Merge two sorted halves","Repeat until fully sorted"]}}

Now convert the user prompt into the JSON object.`
}

async function generateSceneParams(prompt: string) {
  const client = getOpenAIClient()
  const system = buildSceneSpecSystemPrompt()

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      max_tokens: 600,
      temperature: 0.2,
    })

    const text = completion.choices?.[0]?.message?.content || ""
    return safeJsonParse(text)
  } catch (err) {
    console.error("OpenAI scene generation error:", err)
    return null
  }
}

/**
 * Retry once with a stricter instruction if JSON parsing fails.
 */
async function generateSceneParamsStrictRetry(prompt: string) {
  const client = getOpenAIClient()
  const system = buildSceneSpecSystemPrompt()

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `Return ONLY JSON. No markdown. No extra words.\nPrompt: ${prompt}`,
        },
      ],
      max_tokens: 600,
      temperature: 0.0,
    })

    const text = completion.choices?.[0]?.message?.content || ""
    return safeJsonParse(text)
  } catch (err) {
    console.error("OpenAI strict retry error:", err)
    return null
  }
}

/**
 * Fallback: short explanation but we still try to make it "visual friendly"
 * by using a list most of the time.
 */
async function generateFallbackVisualSpec(prompt: string) {
  const client = getOpenAIClient()

  const system = `You are a friendly tutor that produces a compact VISUAL-FIRST summary.

Return ONLY JSON in this schema:
{
  "sceneType": "list" | "text",
  "title": string,
  "params": { "items"?: string[], "content"?: string }
}

Rules:
- Prefer "list" with 4-7 short bullet points.
- Keep each bullet under 12 words.
- Use "text" only if list is impossible.`

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      max_tokens: 250,
      temperature: 0.6,
    })

    const text = completion.choices?.[0]?.message?.content || ""
    return safeJsonParse(text)
  } catch (err) {
    console.error("OpenAI fallback generation error:", err)
    return null
  }
}

function normalizeSceneSpec(sceneSpec: any, originalPrompt: string) {
  // Ensure it always returns a usable structure
  if (!sceneSpec || typeof sceneSpec !== "object") {
    return {
      sceneType: "text",
      title: "Explanation",
      params: { content: originalPrompt },
    }
  }

  // Fill missing basics
  if (!sceneSpec.sceneType) sceneSpec.sceneType = "text"
  if (!sceneSpec.title) sceneSpec.title = originalPrompt.slice(0, 60)

  if (!sceneSpec.params || typeof sceneSpec.params !== "object") {
    sceneSpec.params = {}
  }

  // Scene-specific defaults
  if (sceneSpec.sceneType === "quadratic") {
    sceneSpec.params.a ??= 1
    sceneSpec.params.b ??= -3
    sceneSpec.params.c ??= -4
    sceneSpec.params.showFormula ??= true
    sceneSpec.params.showGraph ??= true
    sceneSpec.params.showRoots ??= true
    sceneSpec.params.showVertex ??= true
    sceneSpec.params.showAxisOfSymmetry ??= true
    sceneSpec.params.notes ??= []
  }

  if (sceneSpec.sceneType === "graph") {
    sceneSpec.params.showAxes ??= true
    sceneSpec.params.xRange ??= [-6, 6]
    sceneSpec.params.yRange ??= [-6, 6]
    sceneSpec.params.functions ??= [{ expr: "x", label: "y=x" }]
  }

  if (sceneSpec.sceneType === "list") {
    sceneSpec.params.items ??= ["Key point 1", "Key point 2", "Key point 3"]
  }

  if (sceneSpec.sceneType === "text") {
    sceneSpec.params.content ??= originalPrompt
  }

  return sceneSpec
}

export async function POST(request: NextRequest) {
  try {
    const clientKey = getClientKey(request)
    if (isRateLimited(clientKey)) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
    }

    const body = await request.json()
    const { prompt, quality } = body as { prompt?: string; quality?: string }

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 })
    }

    const sanitize = sanitizePrompt(prompt)
    if (!sanitize.ok) {
      return NextResponse.json(
        { error: "Prompt rejected", reason: sanitize.reason },
        { status: 400 }
      )
    }

    ensureJobDir()

    const jobId = `manim-${Date.now()}`

    // 0) Check presets first (fast, deterministic)
    let sceneSpec = matchPreset(prompt)
    // 1) If no preset matched, try normal scene generation
    if (!sceneSpec) {
      sceneSpec = await generateSceneParams(prompt)
    }

    // 2) Retry once with strict JSON
    if (!sceneSpec) {
      sceneSpec = await generateSceneParamsStrictRetry(prompt)
    }

    // 3) Fallback to list/text (still visual-friendly)
    if (!sceneSpec) {
      sceneSpec = await generateFallbackVisualSpec(prompt)
    }

    // Normalize & add defaults so renderer won't break
    sceneSpec = normalizeSceneSpec(sceneSpec, prompt)

    const job: any = {
      jobId,
      prompt,
      quality: quality ?? "low",
      status: "queued",
      createdAt: new Date().toISOString(),
      sceneParams: sceneSpec,
    }

    const jobPath = path.join(JOB_DIR, `${jobId}.json`)
    fs.writeFileSync(jobPath, JSON.stringify(job, null, 2))

    return NextResponse.json(
      {
        jobId,
        status: "queued",
        message: "Your request has been queued for rendering.",
        sceneType: sceneSpec.sceneType, // helpful for debugging
      },
      { status: 202 }
    )
  } catch (error) {
    console.error("Manim generate error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
