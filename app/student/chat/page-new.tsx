"use client"

import { useState, useRef, useEffect } from "react"
import { useRequireAuth } from "@/hooks/use-auth"
import { getStudentData, type StudentData } from "@/lib/data-service"
import { StudentHeader } from "@/components/student/header"
import { StudentSidebar } from "@/components/student/sidebar"
import { generateAIResponse, type AIMessage, type StudentContext } from "@/lib/ai-assistant"
import {
  Send,
  Sparkles,
  Loader2,
  Eye,
  Ear,
  BookText,
  Hand,
  Lightbulb,
  ArrowRight,
  RefreshCw
} from "lucide-react"

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

export default function StudentChatPage() {
  const { user, loading } = useRequireAuth(["student"])
  const [studentData, setStudentData] = useState<StudentData | null>(null)
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return

    ;(async () => {
      const data = await getStudentData(user.id)
      setStudentData(data)

      if (data) {
        // Initial greeting message
        const greeting: AIMessage = {
          id: "1",
          role: "assistant",
          content: `Hi ${user.firstName || "there"}! 👋 I'm your AI Learning Assistant, personalized for your ${data.varkProfile.dominantStyle} learning style.

I'll explain concepts using ${data.varkProfile.dominantStyle.toLowerCase()} techniques, with ${data.varkProfile.secondaryStyle.toLowerCase()} support when helpful.

What would you like to learn today?`,
          timestamp: new Date(),
        }
        setMessages([greeting])
      }
    })()
  }, [user?.id])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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

    await new Promise((resolve) => setTimeout(resolve, 800))

    const context: StudentContext = {
      studentName: user?.firstName || "Student",
      dominantLearningStyle: studentData.varkProfile.dominantStyle,
      secondaryStyle: studentData.varkProfile.secondaryStyle,
      currentTopic: studentData.masteryByTopic[0]?.topicName || "General Learning",
      masteryLevel: studentData.overallMastery,
    }

    const aiResponse = generateAIResponse(text, context)
    const assistantMessage: AIMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: aiResponse,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, assistantMessage])
    setIsLoading(false)
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

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <StudentSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <StudentHeader user={user} />

        <main className="flex-1 overflow-hidden flex">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-semibold text-slate-900 dark:text-white">AI Tutor</h1>
                  <p className="text-xs text-slate-500">
                    Personalized for {studentData.varkProfile.dominantStyle} learners
                  </p>
                </div>
                <span className="ml-auto px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-lg">
                  Beta
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xl px-4 py-3 rounded-2xl ${
                      message.role === "user"
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-bl-sm"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={`text-xs mt-2 ${
                        message.role === "user" ? "text-blue-200" : "text-slate-400"
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-2xl rounded-bl-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span className="text-sm text-slate-500">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              {/* Quick Prompts */}
              <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSendMessage(prompt)}
                    disabled={isLoading}
                    className="flex-shrink-0 px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
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
                    <span className="font-semibold text-slate-900 dark:text-white">{studentData.engagementLevel}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${studentData.engagementLevel}%` }}
                    />
                  </div>
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
