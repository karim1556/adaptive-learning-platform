"use client"

import { useRequireAuth } from "@/hooks/use-auth"
import { getTeacherData } from "@/lib/teacher-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TeacherHeader } from "@/components/teacher/header"
import { TeacherSidebar } from "@/components/teacher/sidebar"
import { Search } from "lucide-react"
import { useState } from "react"

export default function TeacherStudentsPage() {
  const { user, loading } = useRequireAuth(["teacher"])
  const [searchTerm, setSearchTerm] = useState("")

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  if (!user) return null

  const teacherData = getTeacherData(user.id)

  // Collect students from all classes (preferred) and dedupe by id
  const classStudents = (teacherData.classes || []).flatMap((c: any) => (c.students || []))
  const uniqueByIdMap = new Map<string, typeof classStudents[number]>()
  for (const s of classStudents) {
    if (!uniqueByIdMap.has(s.id)) uniqueByIdMap.set(s.id, s)
  }
  const uniqueStudents = Array.from(uniqueByIdMap.values())

  const filteredStudents = uniqueStudents.filter((student) =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <TeacherSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TeacherHeader user={user} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Students</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Manage and monitor your students</p>
            </div>

            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents.map((student) => (
                <Card key={student.id} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white">{student.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-slate-300">
                      <p>
                        Mastery: <span className="font-semibold text-white">{student.masteryScore}%</span>
                      </p>
                      <p>
                        Engagement: <span className="font-semibold text-white">{student.engagementLevel}%</span>
                      </p>
                    </div>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">View Details</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
