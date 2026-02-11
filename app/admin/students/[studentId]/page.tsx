"use client"

import { useEffect, useState } from "react"
import { useRequireAuth } from "@/hooks/use-auth"
import { AdminHeader } from "@/components/admin/header"
import { AdminSidebar } from "@/components/admin/sidebar"
import { getLocalStudentMeta, listAllStudents } from "@/lib/student-data"
import { getStudentProfile } from "@/lib/teacher-data"

export default function StudentDetailPage({ params }: { params: { studentId: string } }) {
  const { user, loading } = useRequireAuth(["admin"])
  const studentId = params.studentId
  const [profile, setProfile] = useState<any | null>(null)
  const [meta, setMeta] = useState<any | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    setMeta(getLocalStudentMeta(studentId))
    ;(async () => {
      const p = await getStudentProfile(studentId)
      setProfile(p)
    })()
  }, [studentId])

  if (loading) return <div />
  if (!user) return null

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader user={user} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Student: {studentId}</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded p-4">
                <h3 className="font-semibold mb-2">Profile</h3>
                <div className="text-sm text-slate-700 dark:text-slate-300">
                  <div>Mastery: {profile?.masteryScore ?? '-'}</div>
                  <div>Engagement: {profile?.engagementLevel ?? '-'}</div>
                  <div>Dominant Style: {profile?.dominantStyle ?? '-'}</div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded p-4">
                <h3 className="font-semibold mb-2">Local Meta</h3>
                <div className="text-sm text-slate-700 dark:text-slate-300">
                  <div>Joined classes: {(meta?.joinedClasses || []).length}</div>
                  <ul className="mt-2 space-y-1">
                    {(meta?.joinedClasses || []).map((j: any) => (
                      <li key={j.classCode} className="text-xs">{j.className || j.classCode} — Teacher: {j.teacherId || '-'}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
