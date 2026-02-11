"use client"

import { useRequireAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ParentHeader } from "@/components/parent/header"
import { ParentSidebar } from "@/components/parent/sidebar"
import { MessageSquare, Send } from "lucide-react"

export default function ParentMessagesPage() {
  const { user, loading } = useRequireAuth(["parent"])

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  if (!user) return null

  const conversations = [
    {
      id: 1,
      name: "Mrs. Johnson (Teacher)",
      subject: "Emma's Progress in Math",
      lastMessage: "Emma is showing great improvement in algebra...",
      date: "Today",
      unread: true,
    },
    {
      id: 2,
      name: "School Administrator",
      subject: "Parent-Teacher Conference",
      lastMessage: "We have scheduled the conference for next week...",
      date: "Yesterday",
      unread: false,
    },
  ]

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <ParentSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ParentHeader user={user} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Messages</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Communicate with teachers and administrators</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Conversations List */}
              <div className="lg:col-span-2 space-y-3">
                {conversations.map((conversation) => (
                  <Card
                    key={conversation.id}
                    className={`bg-slate-800/50 border-slate-700 cursor-pointer hover:border-slate-600 transition ${
                      conversation.unread ? "border-blue-600" : ""
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className={`font-semibold ${conversation.unread ? "text-blue-400" : "text-white"}`}>
                          {conversation.name}
                        </h3>
                        <span className="text-xs text-slate-400">{conversation.date}</span>
                      </div>
                      <p className="text-sm text-slate-300 mb-2">{conversation.subject}</p>
                      <p className="text-sm text-slate-400 line-clamp-1">{conversation.lastMessage}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Info Panel */}
              <div>
                <Card className="bg-slate-800/50 border-slate-700 sticky top-6">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Quick Tip
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-slate-300">
                      Use the messaging feature to stay connected with teachers and get updates about your child's
                      progress.
                    </p>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      New Message
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
