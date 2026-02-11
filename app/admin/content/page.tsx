"use client"

import { Suspense } from "react"
import { useRequireAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AdminHeader } from "@/components/admin/header"
import { AdminSidebar } from "@/components/admin/sidebar"
import { Search, Plus } from "lucide-react"
import { useState } from "react"

function AdminContentContent() {
  const { user, loading } = useRequireAuth(["admin"])
  const [searchTerm, setSearchTerm] = useState("")

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  if (!user) return null

  const contentItems = [
    {
      id: 1,
      title: "Introduction to Algebra",
      concept: "Algebraic Equations",
      createdBy: "Margaret Jones",
      views: 245,
      difficulty: "Beginner",
    },
    {
      id: 2,
      title: "Quadratic Functions Deep Dive",
      concept: "Quadratic Functions",
      createdBy: "Margaret Jones",
      views: 189,
      difficulty: "Intermediate",
    },
    {
      id: 3,
      title: "Linear Regression Analysis",
      concept: "Statistics",
      createdBy: "Robert Wilson",
      views: 156,
      difficulty: "Advanced",
    },
    {
      id: 4,
      title: "Basic Geometry Concepts",
      concept: "Geometry",
      createdBy: "Margaret Jones",
      views: 312,
      difficulty: "Beginner",
    },
  ]

  const filteredContent = contentItems.filter(
    (item) =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.concept.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Content Management</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage learning content and curriculum</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Content
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search content by title or concept..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredContent.map((item) => (
          <Card key={item.id} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base">{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-slate-300 space-y-1">
                <p>
                  Concept: <span className="font-semibold">{item.concept}</span>
                </p>
                <p>
                  Created by: <span className="font-semibold">{item.createdBy}</span>
                </p>
                <p>
                  Views: <span className="font-semibold">{item.views}</span>
                </p>
              </div>
              <span className="inline-block px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold">
                {item.difficulty}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-slate-600 text-white hover:bg-slate-700 bg-transparent"
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-red-600/30 text-red-400 hover:bg-red-600/10 bg-transparent"
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}

export default function AdminContentPage() {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader
          user={{ id: "1", email: "admin@school.com", firstName: "Admin", lastName: "User", role: "admin" }}
        />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto">
            <Suspense
              fallback={
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              }
            >
              <AdminContentContent />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}
