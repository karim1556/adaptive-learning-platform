"use client"

import { useRequireAuth } from "@/hooks/use-auth"
import { AdminHeader } from "@/components/admin/header"
import { AdminSidebar } from "@/components/admin/sidebar"
import SeedDemoData from "@/components/admin/seed-demo"
import { Card, CardContent } from "@/components/ui/card"
import { listAllStudents } from "@/lib/student-data"
import { Button } from "@/components/ui/button"

export default function AdminStudentsPage() {
  const { user, loading } = useRequireAuth(["admin"])

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  if (!user) return null

  const students = listAllStudents()

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader user={user} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Students</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Overview of all student accounts and class memberships</p>
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700">Invite Students</Button>
            </div>

            <div className="mb-4">
              <SeedDemoData />
            </div>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Student ID</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Classes</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s) => (
                        <tr key={s.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition">
                          <td className="px-6 py-4 text-sm text-white">{s.id}</td>
                          <td className="px-6 py-4 text-sm text-slate-400">{(s.joinedClasses || []).length}</td>
                          <td className="px-6 py-4 text-sm">
                            <a href={`/admin/students/${s.id}`} className="text-blue-400 hover:text-blue-300 font-medium">View</a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
