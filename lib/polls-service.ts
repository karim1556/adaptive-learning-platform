/**
 * Live Polls Service
 * 
 * Enables real-time classroom engagement through:
 * - Quick polls (instant feedback)
 * - Anonymous responses
 * - Aggregated class-level insights
 * - Post-poll engagement analysis
 */

import { supabase } from "@/lib/supabaseClient"

export interface Poll {
  id: string
  teacherId: string
  classId: string
  className?: string
  title: string
  question: string
  type: "multiple-choice" | "yes-no" | "scale" | "word-cloud" | "open-ended"
  options?: string[]
  scaleMin?: number
  scaleMax?: number
  isAnonymous: boolean
  isActive: boolean
  createdAt: string
  closedAt?: string
  responses: PollResponse[]
}

export interface PollResponse {
  id: string
  pollId: string
  studentId: string
  studentName?: string // Only if not anonymous
  response: string | number
  submittedAt: string
}

export interface PollResults {
  pollId: string
  totalResponses: number
  totalStudents: number
  participationRate: number
  responseDistribution: Record<string, number>
  averageScore?: number // For scale type
  wordFrequency?: Record<string, number> // For word-cloud
  insights: string[]
}

const POLLS_STORAGE_KEY = "adaptiq_polls_v1"
const RESPONSES_STORAGE_KEY = "adaptiq_poll_responses_v1"

function loadPolls(): Poll[] {
  if (typeof window === "undefined") return []
  const raw = localStorage.getItem(POLLS_STORAGE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function savePolls(polls: Poll[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(POLLS_STORAGE_KEY, JSON.stringify(polls))
}

function loadResponses(): PollResponse[] {
  if (typeof window === "undefined") return []
  const raw = localStorage.getItem(RESPONSES_STORAGE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveResponses(responses: PollResponse[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(RESPONSES_STORAGE_KEY, JSON.stringify(responses))
}

/**
 * Create a new poll
 */
export async function createPoll(
  teacherId: string,
  classId: string,
  data: {
    title: string
    question: string
    type: Poll["type"]
    options?: string[]
    scaleMin?: number
    scaleMax?: number
    isAnonymous?: boolean
  }
): Promise<{ success: boolean; poll?: Poll; error?: string }> {
  try {
    const poll: Poll = {
      id: `poll-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      teacherId,
      classId,
      title: data.title,
      question: data.question,
      type: data.type,
      options: data.options,
      scaleMin: data.scaleMin ?? 1,
      scaleMax: data.scaleMax ?? 5,
      isAnonymous: data.isAnonymous ?? true,
      isActive: true,
      createdAt: new Date().toISOString(),
      responses: []
    }

    // Persist to Supabase
    const { error } = await supabase.from("polls").insert({
      id: poll.id,
      teacher_id: poll.teacherId,
      class_id: poll.classId,
      title: poll.title,
      question: poll.question,
      type: poll.type,
      options: poll.options || null,
      scale_min: poll.scaleMin,
      scale_max: poll.scaleMax,
      is_anonymous: poll.isAnonymous,
      is_active: poll.isActive,
      created_at: poll.createdAt
    })

    if (error) {
      console.error("Supabase error creating poll:", error)
      return { success: false, error: String(error) }
    }

    return { success: true, poll }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Get active poll for a class
 */
export async function getActivePollForClass(classId: string): Promise<Poll | null> {
  const polls = await getActivePolls(classId)
  return polls.length > 0 ? polls[0] : null
}

/**
 * Get all polls for a teacher
 */
export async function getTeacherPolls(teacherId: string): Promise<Poll[]> {
  try {
    console.debug("getTeacherPolls: teacherId=", teacherId)
    const { data: pollsData, error: pollsError } = await supabase
      .from("polls")
      .select("id, teacher_id, class_id, title, question, type, options, scale_min, scale_max, is_anonymous, is_active, created_at, closed_at")
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false })

    if (pollsError) {
      console.error("Supabase error fetching teacher polls:", pollsError)
      return []
    }

    if (!pollsData || pollsData.length === 0) return []

    const pollIds = pollsData.map((p: any) => p.id)
    const { data: responsesData, error: respError } = await supabase
      .from("poll_responses")
      .select("id, poll_id, student_id, student_name, response, submitted_at")
      .in("poll_id", pollIds)

    if (respError) console.error("Supabase error fetching poll responses:", respError)
    console.debug(`getTeacherPolls: found ${pollsData.length} polls, responses=${responsesData?.length || 0}`)

    const parseOptions = (opts: any) => {
      if (!opts) return undefined
      try {
        if (typeof opts === "string") return JSON.parse(opts)
        return opts
      } catch {
        return undefined
      }
    }

    return pollsData.map((p: any) => ({
      id: p.id,
      teacherId: p.teacher_id,
      classId: p.class_id,
      title: p.title,
      question: p.question,
      type: p.type,
      options: parseOptions(p.options),
      scaleMin: p.scale_min,
      scaleMax: p.scale_max,
      isAnonymous: p.is_anonymous,
      isActive: p.is_active,
      createdAt: p.created_at,
      closedAt: p.closed_at || undefined,
      responses: (responsesData || []).filter((r: any) => r.poll_id === p.id).map((r: any) => ({
        id: r.id,
        pollId: r.poll_id,
        studentId: r.student_id,
        studentName: r.student_name || undefined,
        response: r.response,
        submittedAt: r.submitted_at
      }))
    }))
  } catch (e) {
    console.error("Error in getTeacherPolls:", e)
    return []
  }
}

/**
 * Get all active polls across classes (fallback for students not enrolled)
 */
export async function getAllActivePolls(): Promise<Poll[]> {
  try {
    console.debug("getAllActivePolls: fetching all active polls")
    const { data: pollsData, error: pollsError } = await supabase
      .from("polls")
      .select("id, teacher_id, class_id, title, question, type, options, scale_min, scale_max, is_anonymous, is_active, created_at, closed_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })

    if (pollsError) {
      console.error("Supabase error fetching all active polls:", pollsError)
      return []
    }

    if (!pollsData || pollsData.length === 0) return []

    const pollIds = pollsData.map((p: any) => p.id)
    const { data: responsesData, error: respError } = await supabase
      .from("poll_responses")
      .select("id, poll_id, student_id, student_name, response, submitted_at")
      .in("poll_id", pollIds)

    if (respError) console.error("Supabase error fetching poll responses:", respError)
    console.debug(`getAllActivePolls: found ${pollsData.length} polls, responses=${responsesData?.length || 0}`)

    const parseOptions = (opts: any) => {
      if (!opts) return undefined
      try {
        if (typeof opts === "string") return JSON.parse(opts)
        return opts
      } catch {
        return undefined
      }
    }

    return pollsData.map((p: any) => ({
      id: p.id,
      teacherId: p.teacher_id,
      classId: p.class_id,
      title: p.title,
      question: p.question,
      type: p.type,
      options: parseOptions(p.options),
      scaleMin: p.scale_min,
      scaleMax: p.scale_max,
      isAnonymous: p.is_anonymous,
      isActive: p.is_active,
      createdAt: p.created_at,
      closedAt: p.closed_at || undefined,
      responses: (responsesData || []).filter((r: any) => r.poll_id === p.id).map((r: any) => ({
        id: r.id,
        pollId: r.poll_id,
        studentId: r.student_id,
        studentName: r.student_name || undefined,
        response: r.response,
        submittedAt: r.submitted_at
      }))
    }))
  } catch (e) {
    console.error("Error in getAllActivePolls:", e)
    return []
  }
}

/**
 * Get polls for a class (student view)
 */
export async function getClassPolls(classId: string, studentId: string): Promise<Poll[]> {
  // Leverage getActivePolls and then filter responses for the student
  const polls = await getActivePolls(classId)
  return polls.map(p => ({
    ...p,
    responses: (p.responses || []).filter(r => r.studentId === studentId)
  }))
}

/**
 * Submit a poll response
 */
export async function submitPollResponse(
  pollId: string,
  studentId: string,
  studentName: string,
  response: string | number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check poll exists and is active
    const { data: pollData, error: pollErr } = await supabase
      .from("polls")
      .select("id, is_active, is_anonymous")
      .eq("id", pollId)
      .maybeSingle()

    if (pollErr) {
      console.error("Supabase error fetching poll:", pollErr)
      return { success: false, error: String(pollErr) }
    }

    if (!pollData) return { success: false, error: "Poll not found" }
    if (!pollData.is_active) return { success: false, error: "Poll is closed" }

    // Check existing response
    const { data: existing, error: existErr } = await supabase
      .from("poll_responses")
      .select("id")
      .eq("poll_id", pollId)
      .eq("student_id", studentId)
      .limit(1)

    if (existErr) console.error("Supabase error checking existing response:", existErr)
    if (existing && existing.length > 0) return { success: false, error: "Already responded to this poll" }

    const respId = `resp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const { error: insertErr } = await supabase.from("poll_responses").insert({
      id: respId,
      poll_id: pollId,
      student_id: studentId,
      student_name: pollData.is_anonymous ? null : studentName,
      response: String(response),
      submitted_at: new Date().toISOString()
    })

    if (insertErr) {
      console.error("Supabase error inserting response:", insertErr)
      return { success: false, error: String(insertErr) }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Close a poll
 */
export function closePoll(pollId: string): { success: boolean } {
  // Update Supabase poll
  supabase.from("polls").update({ is_active: false, closed_at: new Date().toISOString() }).eq("id", pollId)
  return { success: true }
}

/**
 * Delete a poll
 */
export function deletePoll(pollId: string): { success: boolean } {
  // Delete from Supabase (responses cascade if FK configured)
  supabase.from("poll_responses").delete().eq("poll_id", pollId)
  supabase.from("polls").delete().eq("id", pollId)
  return { success: true }
}

/**
 * Calculate poll results with insights
 */
export function calculatePollResults(poll: Poll, totalStudentsInClass: number): PollResults {
  const responses = (poll.responses || [])
  
  const totalResponses = responses.length
  const participationRate = totalStudentsInClass > 0 
    ? Math.round((totalResponses / totalStudentsInClass) * 100) 
    : 0

  const responseDistribution: Record<string, number> = {}
  let sum = 0
  const wordCounts: Record<string, number> = {}

  for (const resp of responses) {
    const key = String(resp.response)
    responseDistribution[key] = (responseDistribution[key] || 0) + 1
    
    if (poll.type === "scale") {
      sum += Number(resp.response)
    }
    
    if (poll.type === "word-cloud" || poll.type === "open-ended") {
      const words = key.toLowerCase().split(/\s+/)
      for (const word of words) {
        if (word.length > 2) {
          wordCounts[word] = (wordCounts[word] || 0) + 1
        }
      }
    }
  }

  const insights: string[] = []

  // Generate insights based on poll type and results
  if (participationRate >= 90) {
    insights.push("Excellent participation! Nearly all students responded.")
  } else if (participationRate >= 70) {
    insights.push("Good participation rate. Most students are engaged.")
  } else if (participationRate >= 50) {
    insights.push("Moderate participation. Consider follow-up to engage remaining students.")
  } else {
    insights.push("Low participation. Students may need encouragement or more time.")
  }

  if (poll.type === "multiple-choice" || poll.type === "yes-no") {
    const sorted = Object.entries(responseDistribution).sort((a, b) => b[1] - a[1])
    if (sorted.length > 0) {
      const [topChoice, topCount] = sorted[0]
      const percentage = Math.round((topCount / totalResponses) * 100)
      insights.push(`Most common response: "${topChoice}" (${percentage}% of responses)`)
      
      if (percentage > 80) {
        insights.push("Strong consensus among students on this topic.")
      } else if (sorted.length > 1 && sorted[1][1] > totalResponses * 0.3) {
        insights.push("Responses are split - consider discussing different perspectives.")
      }
    }
  }

  if (poll.type === "scale") {
    const avg = totalResponses > 0 ? sum / totalResponses : 0
    const midpoint = ((poll.scaleMin || 1) + (poll.scaleMax || 5)) / 2
    
    if (avg > midpoint + 1) {
      insights.push("Students generally feel positive about this topic.")
    } else if (avg < midpoint - 1) {
      insights.push("Students may be struggling or feeling uncertain. Consider additional support.")
    } else {
      insights.push("Mixed feelings - a class discussion might help clarify understanding.")
    }
  }

  return {
    pollId: poll.id,
    totalResponses,
    totalStudents: totalStudentsInClass,
    participationRate,
    responseDistribution,
    averageScore: poll.type === "scale" && totalResponses > 0 ? Math.round((sum / totalResponses) * 10) / 10 : undefined,
    wordFrequency: poll.type === "word-cloud" || poll.type === "open-ended" ? wordCounts : undefined,
    insights
  }
}

/**
 * Quick poll templates for common use cases
 */
export const pollTemplates = {
  comprehensionCheck: {
    title: "Quick Comprehension Check",
    question: "How well do you understand today's topic?",
    type: "scale" as const,
    scaleMin: 1,
    scaleMax: 5,
    isAnonymous: true
  },
  readyToProceed: {
    title: "Ready Check",
    question: "Are you ready to move on to the next topic?",
    type: "yes-no" as const,
    options: ["Yes, I'm ready", "No, I need more time"],
    isAnonymous: true
  },
  topicInterest: {
    title: "Topic Interest",
    question: "Which topic would you like to explore more?",
    type: "multiple-choice" as const,
    options: ["Topic A", "Topic B", "Topic C", "Something else"],
    isAnonymous: true
  },
  openFeedback: {
    title: "Open Feedback",
    question: "What questions do you have about today's lesson?",
    type: "open-ended" as const,
    isAnonymous: true
  },
  wordCloud: {
    title: "Key Concepts",
    question: "What is one word that describes what you learned today?",
    type: "word-cloud" as const,
    isAnonymous: true
  }
}

/**
 * Get all active polls for a class
 */
export async function getActivePolls(classId: string): Promise<Poll[]> {
  try {
    console.debug("getActivePolls: classId=", classId)
    const { data: pollsData, error: pollsError } = await supabase
      .from("polls")
      .select("id, teacher_id, class_id, title, question, type, options, scale_min, scale_max, is_anonymous, is_active, created_at, closed_at")
      .eq("class_id", classId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })

    if (pollsError) {
      console.error("Supabase error fetching polls:", pollsError)
      return []
    }

    if (!pollsData || pollsData.length === 0) return []

    const pollIds = pollsData.map((p: any) => p.id)
    const { data: responsesData, error: respError } = await supabase
      .from("poll_responses")
      .select("id, poll_id, student_id, student_name, response, submitted_at")
      .in("poll_id", pollIds)

    if (respError) {
      console.error("Supabase error fetching poll responses:", respError)
    }

    console.debug(`getActivePolls: found ${pollsData.length} polls, responses=${responsesData?.length || 0}`)

    return pollsData.map((p: any) => ({
      id: p.id,
      teacherId: p.teacher_id,
      classId: p.class_id,
      title: p.title,
      question: p.question,
      type: p.type,
      options: p.options || undefined,
      scaleMin: p.scale_min,
      scaleMax: p.scale_max,
      isAnonymous: p.is_anonymous,
      isActive: p.is_active,
      createdAt: p.created_at,
      closedAt: p.closed_at || undefined,
      responses: (responsesData || []).filter((r: any) => r.poll_id === p.id).map((r: any) => ({
        id: r.id,
        pollId: r.poll_id,
        studentId: r.student_id,
        studentName: r.student_name || undefined,
        response: r.response,
        submittedAt: r.submitted_at
      }))
    }))
  } catch (e) {
    console.error("Error in getActivePolls:", e)
    return []
  }
}

/**
 * Check if a student has already responded to a poll
 */
export async function hasStudentResponded(pollId: string, studentId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("poll_responses")
      .select("id")
      .eq("poll_id", pollId)
      .eq("student_id", studentId)
      .limit(1)

    if (error) {
      console.error("Supabase error checking response:", error)
      return false
    }
    return Array.isArray(data) && data.length > 0
  } catch (e) {
    console.error("Error in hasStudentResponded:", e)
    return false
  }
}

/**
 * Get a student's poll history
 */
export async function getStudentPollHistory(studentId: string): Promise<{ poll: Poll; response: PollResponse }[]> {
  try {
    const { data: responsesData, error: respError } = await supabase
      .from("poll_responses")
      .select("id, poll_id, student_id, student_name, response, submitted_at")
      .eq("student_id", studentId)
      .order("submitted_at", { ascending: false })

    if (respError) {
      console.error("Supabase error fetching student responses:", respError)
      return []
    }

    if (!responsesData || responsesData.length === 0) return []

    const pollIds = responsesData.map((r: any) => r.poll_id)
    const { data: pollsData, error: pollsError } = await supabase
      .from("polls")
      .select("id, teacher_id, class_id, title, question, type, options, scale_min, scale_max, is_anonymous, is_active, created_at, closed_at")
      .in("id", pollIds)

    if (pollsError) {
      console.error("Supabase error fetching polls for history:", pollsError)
    }

    return responsesData
      .map((resp: any) => {
        const p = (pollsData || []).find((pp: any) => pp.id === resp.poll_id)
        if (!p) return null
        const poll: Poll = {
          id: p.id,
          teacherId: p.teacher_id,
          classId: p.class_id,
          title: p.title,
          question: p.question,
          type: p.type,
          options: p.options || undefined,
          scaleMin: p.scale_min,
          scaleMax: p.scale_max,
          isAnonymous: p.is_anonymous,
          isActive: p.is_active,
          createdAt: p.created_at,
          closedAt: p.closed_at || undefined,
          responses: []
        }
        const response: PollResponse = {
          id: resp.id,
          pollId: resp.poll_id,
          studentId: resp.student_id,
          studentName: resp.student_name || undefined,
          response: resp.response,
          submittedAt: resp.submitted_at
        }
        return { poll, response }
      })
      .filter((i): i is { poll: Poll; response: PollResponse } => i !== null)
  } catch (e) {
    console.error("Error in getStudentPollHistory:", e)
    return []
  }
}

export default {
  createPoll,
  getActivePollForClass,
  getActivePolls,
  getTeacherPolls,
  getClassPolls,
  submitPollResponse,
  closePoll,
  deletePoll,
  calculatePollResults,
  hasStudentResponded,
  getStudentPollHistory,
  pollTemplates
}
