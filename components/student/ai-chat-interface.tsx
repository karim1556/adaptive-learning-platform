"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Send, Sparkles, Loader2 } from "lucide-react"
import { generateAIResponse, type AIMessage } from "@/lib/ai-assistant"
import type { StudentContext } from "@/lib/ai-assistant"

interface AIChatInterfaceProps {
  studentContext: StudentContext
}

export function AIChatInterface({ studentContext }: AIChatInterfaceProps) {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: "1",
      role: "assistant",
      content: `Hi ${studentContext.studentName}! 👋 I'm your AI Learning Assistant. I'm here to help you master "${studentContext.currentTopic}". 

I know you learn best as a ${studentContext.dominantLearningStyle.toLowerCase()} learner${
        studentContext.secondaryStyle
          ? `, with ${studentContext.secondaryStyle.toLowerCase()} as a secondary style`
          : ""
      }. I'll explain concepts in a way that works for you!

Ask me anything about this topic, and I'll:
- Explain concepts in your learning style
- Provide practice problems
- Help you improve your understanding

What would you like to learn about?`,
      timestamp: new Date(),
    },
  ])

  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    // Add user message
    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setLoading(true)

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800))

    // Generate AI response
    const aiResponse = generateAIResponse(input, studentContext)
    const assistantMessage: AIMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: aiResponse,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, assistantMessage])
    setLoading(false)
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <CardTitle className="flex items-center gap-2">
            AI Learning Assistant
            <Badge className="bg-blue-600">Beta</Badge>
          </CardTitle>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
          Personalized for {studentContext.dominantLearningStyle} learners
          {studentContext.secondaryStyle && ` • Secondary: ${studentContext.secondaryStyle}`} •{" "}
          {studentContext.currentTopic}
        </p>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col p-4">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 rounded-lg ${
                  message.role === "user"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-none"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className={`text-xs mt-1 ${message.role === "user" ? "text-blue-100" : "text-slate-500"}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 dark:bg-slate-700 px-4 py-3 rounded-lg rounded-bl-none">
                <div className="flex gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="flex gap-2 mt-4 border-t pt-4">
          <Input
            placeholder="Ask me anything about this topic..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="bg-transparent"
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()} className="gap-2">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
