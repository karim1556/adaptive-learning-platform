"use client"

import { Fragment, useState, useRef, useEffect, useCallback } from "react"
import { useRequireAuth } from "@/hooks/use-auth"
import { getStudentData, type StudentData } from "@/lib/data-service"
import { getModuleFeedbackAggregate } from "@/lib/module-feedback"
import { supabase } from "@/lib/supabaseClient"
import { StudentHeader } from "@/components/student/header"
import { StudentSidebar } from "@/components/student/sidebar"
import { LearningStyleDropdown, type LearningStyleOption, LEARNING_STYLES } from "@/components/student/learning-style-dropdown"
import dynamic from "next/dynamic"
import {
  Send,
  Sparkles,
  Loader2,
  Eye,
  Ear,
  BookText,
  Hand,
  Lightbulb,
  Mic,
} from "lucide-react"

// Dynamically import components that use browser APIs
const MermaidDiagram = dynamic(() => import("@/components/student/mermaid-diagram"), {
  ssr: false,
  loading: () => <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />,
})

const AudioPlayer = dynamic(() => import("@/components/student/audio-player"), {
  ssr: false,
  loading: () => <div className="h-16 bg-purple-500/20 rounded-xl animate-pulse" />,
})

const LabCards = dynamic(() => import("@/components/student/lab-cards"), {
  ssr: false,
})

const VoiceChat = dynamic<any>(() => import("../../../components/student/voice-chat").then(mod => mod.default), {
  ssr: false,
  loading: () => <div className="h-24 bg-purple-500/20 rounded-xl animate-pulse" />,
})

// Types
interface DiagramData {
  type: 'mermaid' | 'svg' | 'image'
  code?: string
  url?: string
  alt: string
}

interface AudioData {
  url?: string
  text: string
  voiceId?: string
  duration?: number
}

interface LabResource {
  title: string
  url: string
  provider: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  duration?: string
}

interface AIMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  style?: LearningStyleOption['id']
  diagram?: DiagramData
  audio?: AudioData
  labs?: LabResource[]
}

const VARK_CONFIG = {
  Visual: { icon: Eye, color: "bg-blue-500", tip: "Try drawing a diagram or mind map" },
  Auditory: { icon: Ear, color: "bg-purple-500", tip: "Try explaining this out loud" },
  Reading: { icon: BookText, color: "bg-emerald-500", tip: "Write notes or create a summary" },
  Kinesthetic: { icon: Hand, color: "bg-amber-500", tip: "Practice with hands-on exercises" },
}

const SUGGESTED_PROMPTS = [
  "Explain this concept in a simple way",
  "Give me practice problems",
  "How can I apply this in real life?",
  "What should I learn next?",
]

function renderInlineFormatting(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((segment, index) => {
    if (segment.startsWith("**") && segment.endsWith("**")) {
      return (
        <strong key={`${segment}-${index}`} className="font-semibold text-slate-950 dark:text-white">
          {segment.slice(2, -2)}
        </strong>
      )
    }

    return <Fragment key={`${segment}-${index}`}>{segment}</Fragment>
  })
}

function renderMessageContent(content: string) {
  const normalized = content.replace("[DIAGRAM]", "").trim()

  if (!normalized) {
    return null
  }

  return normalized.split(/\n{2,}/).map((block, blockIndex) => {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)

    const isBulletGroup = lines.length > 0 && lines.every((line) => /^[-*]\s+/.test(line))

    if (isBulletGroup) {
      return (
        <ul key={`block-${blockIndex}`} className="space-y-2 pl-5 text-[15px] leading-7 text-slate-700 dark:text-slate-200">
          {lines.map((line, lineIndex) => (
            <li key={`line-${blockIndex}-${lineIndex}`} className="list-disc">
              {renderInlineFormatting(line.replace(/^[-*]\s+/, ""))}
            </li>
          ))}
        </ul>
      )
    }

    return (
      <p
        key={`block-${blockIndex}`}
        className="whitespace-pre-line text-[15px] leading-7 text-slate-700 dark:text-slate-200"
      >
        {renderInlineFormatting(block)}
      </p>
    )
  })
}

export default function StudentChatPage() {
  const { user, loading } = useRequireAuth(["student"])
  const [studentData, setStudentData] = useState<StudentData | null>(null)
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedStyle, setSelectedStyle] = useState<LearningStyleOption['id']>('reading')
  const [availableStyles, setAvailableStyles] = useState<LearningStyleOption['id'][]>(['reading', 'visual'])
  const [showVoiceChat, setShowVoiceChat] = useState(false)
  const [feedbackSummary, setFeedbackSummary] = useState("")
  const [parentContact, setParentContact] = useState<{ parentEmail?: string; parentName?: string }>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return

    ;(async () => {
      const data = await getStudentData(user.id)
      setStudentData(data)

      if (data) {
        const { data: authData } = await supabase.auth.getUser()
        const meta = (authData?.user?.user_metadata || {}) as any
        setParentContact({
          parentEmail: meta?.studentDetails?.parentEmail,
          parentName: meta?.studentDetails?.parentName,
        })

        const feedback = await getModuleFeedbackAggregate({
          conceptName: data.masteryByTopic[0]?.topicName || data.recentActivity[0]?.description,
        })
        setFeedbackSummary(feedback.promptSummary)

        // Set available styles based on student's VARK profile (top 2)
        const dominant = data.varkProfile.dominantStyle?.toLowerCase() as LearningStyleOption['id']
        const secondary = data.varkProfile.secondaryStyle?.toLowerCase() as LearningStyleOption['id']
        
        const validStyles: LearningStyleOption['id'][] = []
        if (['reading', 'visual', 'auditory', 'kinesthetic'].includes(dominant)) {
          validStyles.push(dominant)
        }
        if (['reading', 'visual', 'auditory', 'kinesthetic'].includes(secondary) && secondary !== dominant) {
          validStyles.push(secondary)
        }
        
        // Fallback to reading if no valid styles
        if (validStyles.length === 0) {
          validStyles.push('reading')
        }
        
        setAvailableStyles(validStyles)
        setSelectedStyle(validStyles[0])

        // Initial greeting message
        const styleName = LEARNING_STYLES.find(s => s.id === validStyles[0])?.label || 'Reading'
        const greeting: AIMessage = {
          id: "1",
          role: "assistant",
          content: `Hi ${user.firstName || "there"}! 👋 I'm your AI Learning Assistant, personalized for your ${data.varkProfile.dominantStyle} learning style.

I'll explain concepts using ${styleName.toLowerCase()} techniques${validStyles[1] ? `, with ${LEARNING_STYLES.find(s => s.id === validStyles[1])?.label.toLowerCase()} support when helpful` : ''}.

You can switch between your learning styles using the dropdown below!

What would you like to learn today?`,
          timestamp: new Date(),
          style: validStyles[0],
        }
        setMessages([greeting])
      }
    })()
  }, [user?.id])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || input
    if (!text.trim() || !studentData) return

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      // Call the AI API with the selected learning style
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          style: selectedStyle,
          context: {
            studentName: user?.firstName || 'Student',
            dominantLearningStyle: selectedStyle,
            secondaryStyle: studentData.varkProfile.secondaryStyle,
            currentTopic: studentData.masteryByTopic[0]?.topicName || 'General Learning',
            conceptId: studentData.masteryByTopic[0]?.topicId,
            masteryLevel: studentData.overallMastery,
            grade: 7,
            studentId: user?.id,
            feedbackSummary,
            // Include recent conversation history so the AI retains context
            conversationHistory: [...messages, userMessage].slice(-10).map(m => ({ role: m.role, content: m.content })),
          },
        }),
      })

      const data = await response.json()

      const assistantMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content || "I'm sorry, I couldn't generate a response. Please try again.",
        timestamp: new Date(),
        style: selectedStyle,
        diagram: data.diagram,
        audio: data.audio,
        labs: data.labs,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('AI Chat Error:', error)
      
      const errorMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
        style: selectedStyle,
      }
      
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleResourceRecommendations = async () => {
    if (!studentData) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/ai/resource-linker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: studentData.masteryByTopic[0]?.topicName || "General Learning",
          dominantStyle: selectedStyle,
          secondaryStyle: studentData.varkProfile.secondaryStyle,
          masteryLevel: studentData.overallMastery,
        }),
      })

      const data = await response.json()
      const assistantMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message || "Here are a few free resources matched to your learning profile.",
        timestamp: new Date(),
        style: selectedStyle,
        labs: data.resources || [],
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Resource recommendation error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleParentSnapshot = async () => {
    if (!studentData || !parentContact.parentEmail) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/ai/parent-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: user?.id,
          parentEmail: parentContact.parentEmail,
          parentName: parentContact.parentName,
          studentSnapshot: {
            studentName: studentData.name,
            overallMastery: studentData.overallMastery,
            engagementLevel: studentData.engagementIndex,
            dominantStyle: studentData.varkProfile.dominantStyle,
            masteryByTopic: studentData.masteryByTopic.map((topic) => ({
              topicName: topic.topicName,
              score: topic.score,
            })),
            badges: [],
            recentActivity: studentData.recentActivity.map((activity) => ({
              description: activity.description,
              timestamp: activity.timestamp,
            })),
          },
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || "Unable to create a parent snapshot.")
      }

      if (data.mailtoUrl && data.deliveryStatus !== "sent") {
        window.location.href = data.mailtoUrl
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            data.deliveryStatus === "sent"
              ? `Your weekly mastery snapshot has been emailed to ${parentContact.parentEmail}.`
              : `I drafted a weekly mastery snapshot for ${parentContact.parentEmail}. Review the email draft and send when ready.`,
          timestamp: new Date(),
          style: selectedStyle,
        },
      ])
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: error?.message || "I couldn't prepare the parent snapshot just now.",
          timestamp: new Date(),
          style: selectedStyle,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSendMessage()
  }

  if (loading || !studentData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  const dominantConfig = VARK_CONFIG[studentData.varkProfile.dominantStyle as keyof typeof VARK_CONFIG]
  const DominantIcon = dominantConfig?.icon || Eye

  // Get style info for display
  const selectedStyleInfo = LEARNING_STYLES.find(s => s.id === selectedStyle)
  const ActiveStyleIcon = selectedStyleInfo?.icon || Eye

  return (
    <div className="flex min-h-[100dvh] bg-slate-50 dark:bg-slate-900">
      <StudentSidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <StudentHeader user={user} />

        <main className="flex flex-1 overflow-hidden pb-24 lg:pb-0">
          {/* Chat Area */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Chat Header */}
            <div className="border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-800/95 sm:px-6 sm:py-4">
              <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-600/20">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg font-semibold text-slate-900 dark:text-white">AI Tutor</h1>
                  <p className="text-xs text-slate-500 sm:text-sm">
                    Personalized for {selectedStyleInfo?.label || studentData.varkProfile.dominantStyle} learners
                  </p>
                </div>
                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">
                  Beta
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-5">
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 sm:gap-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex w-full ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`w-fit max-w-[88%] sm:max-w-xl lg:max-w-2xl ${
                        message.role === "user"
                          ? "rounded-[24px] rounded-br-md bg-blue-600 px-4 py-3 text-white shadow-lg shadow-blue-600/20"
                          : "space-y-2 sm:space-y-3"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <>
                          {/* Text Content */}
                          <div className="rounded-[24px] rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:px-5">
                            <div className="space-y-4">
                              {renderMessageContent(message.content)}
                            </div>
                            <p className="mt-3 text-xs text-slate-400">
                              {message.timestamp.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              {message.style && (
                                <span className="ml-2 text-slate-300">
                                  • {LEARNING_STYLES.find(s => s.id === message.style)?.label} mode
                                </span>
                              )}
                            </p>
                          </div>

                          {/* Visual: Mermaid Diagram */}
                          {message.diagram?.code && (
                            <MermaidDiagram
                              code={message.diagram.code}
                              alt={message.diagram.alt}
                            />
                          )}

                          {/* Auditory: Audio Player */}
                          {message.audio?.text && (
                            <AudioPlayer
                              text={message.audio.text}
                            />
                          )}

                          {/* Kinesthetic: Lab Cards */}
                          {message.labs && message.labs.length > 0 && (
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                              <LabCards labs={message.labs} />
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="whitespace-pre-wrap text-[15px] leading-6">{message.content}</p>
                          <p className="mt-2 text-xs text-blue-200">
                            {message.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-[24px] rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span className="text-sm text-slate-500">
                          Generating {selectedStyleInfo?.label?.toLowerCase() || ''} response...
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div
              className="border-t border-slate-200 bg-white/95 px-3 pt-3 backdrop-blur dark:border-slate-700 dark:bg-slate-800/95 sm:px-4 sm:pt-4"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
            >
              <div className="mx-auto w-full max-w-4xl rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.45)] dark:border-slate-700 dark:bg-slate-900 sm:p-4">
                {/* Voice Chat Mode for Auditory */}
                {showVoiceChat ? (
                  <div className="py-2">
                    <VoiceChat
                      studentName={user?.firstName || 'Student'}
                      topic={studentData?.masteryByTopic[0]?.topicName}
                      mastery={studentData?.overallMastery}
                      onClose={() => setShowVoiceChat(false)}
                    />
                  </div>
                ) : (
                  <>
                    {/* Quick Prompts */}
                    <div className="mb-3 flex gap-2 overflow-x-auto pb-2">
                      {SUGGESTED_PROMPTS.map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => handleSendMessage(prompt)}
                          disabled={isLoading}
                          className="flex-shrink-0 rounded-full bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                        >
                          {prompt}
                        </button>
                      ))}
                      <button
                        onClick={handleResourceRecommendations}
                        disabled={isLoading}
                        className="flex-shrink-0 rounded-full bg-amber-100 px-3 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-200 disabled:opacity-50"
                      >
                        Find free resources
                      </button>
                      {parentContact.parentEmail && (
                        <button
                          onClick={handleParentSnapshot}
                          disabled={isLoading}
                          className="flex-shrink-0 rounded-full bg-emerald-100 px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-200 disabled:opacity-50"
                        >
                          Share weekly snapshot
                        </button>
                      )}
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      {/* Learning Style Dropdown */}
                      <LearningStyleDropdown
                        value={selectedStyle}
                        onChange={setSelectedStyle}
                        availableStyles={availableStyles}
                        className="sm:self-end"
                      />

                      <div className="flex flex-1 items-end gap-2 sm:gap-3">
                        {/* Input Field */}
                        <input
                          type="text"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder="Ask anything..."
                          disabled={isLoading}
                          className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
                        />

                        {/* Voice Chat Button (for Auditory) */}
                        {selectedStyle === 'auditory' && (
                          <button
                            type="button"
                            onClick={() => setShowVoiceChat(true)}
                            className="rounded-2xl bg-purple-600 px-3 py-3 text-white transition hover:bg-purple-700 sm:px-4"
                            title="Start voice conversation"
                          >
                            <Mic className="h-5 w-5" />
                          </button>
                        )}

                        {/* Send Button */}
                        <button
                          type="submit"
                          disabled={isLoading || !input.trim()}
                          className="rounded-2xl bg-blue-600 px-3 py-3 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
                        >
                          <Send className="h-5 w-5" />
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-72 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 hidden lg:block overflow-y-auto">
            {/* Learning Style */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Your Learning Style</h3>
              <div className={`p-4 rounded-xl ${dominantConfig?.color || "bg-blue-500"} text-white`}>
                <div className="flex items-center gap-2 mb-2">
                  <DominantIcon className="w-5 h-5" />
                  <span className="font-semibold">{studentData.varkProfile.dominantStyle}</span>
                </div>
                <p className="text-sm opacity-90">{dominantConfig?.tip || "Keep learning!"}</p>
              </div>
            </div>

            {/* Progress */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Current Progress</h3>
              <div className="space-y-3">
                <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-500">Mastery</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{studentData.overallMastery}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${studentData.overallMastery}%` }}
                    />
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-500">Engagement</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{studentData.engagementIndex}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${studentData.engagementIndex}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Active Style Indicator */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Active Response Mode</h3>
              <div className={`p-3 rounded-xl border-2 ${selectedStyleInfo?.bgColor ? `border-${selectedStyleInfo.bgColor.replace('bg-', '')}` : 'border-emerald-500'} bg-slate-50 dark:bg-slate-700`}>
                <div className="flex items-center gap-2">
                  {selectedStyleInfo && (
                    <>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedStyleInfo?.bgColor || 'bg-slate-400'}`}>
                        <ActiveStyleIcon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{selectedStyleInfo.label}</p>
                        <p className="text-xs text-slate-500">{selectedStyleInfo.description}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Tips */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Learning Tips</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>Ask follow-up questions for deeper understanding</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>Request practice problems to test yourself</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>Ask for real-world examples</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
