"use client"

import { useRequireAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AdminHeader } from "@/components/admin/header"
import { AdminSidebar } from "@/components/admin/sidebar"
import { BarChart3, Download, Calendar } from "lucide-react"

export default function AdminReportsPage() {
  const { user, loading } = useRequireAuth(["admin"])

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  if (!user) return null

  const reports = [
    {
      id: 1,
      title: "Student Performance Summary",
      description: "Overall mastery scores and engagement metrics across all students",
      generatedDate: "2026-01-28",
      format: "PDF",
    },
    {
      id: 2,
      title: "Teacher Adoption Report",
      description: "How actively teachers are using AdaptIQ features",
      generatedDate: "2026-01-25",
      format: "PDF",
    },
    {
      id: 3,
      title: "Learning Style Distribution",
      description: "Breakdown of VARK learning styles across the student population",
      generatedDate: "2026-01-20",
      format: "CSV",
    },
    {
      id: 4,
      title: "Platform Usage Analytics",
      description: "Daily active users, feature usage, and system health metrics",
      generatedDate: "2026-01-15",
      format: "PDF",
    },
  ]

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader user={user} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Reports</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Generate and download platform reports</p>
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Generate Report
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reports.map((report) => (
                <Card key={report.id} className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">{report.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-slate-300">{report.description}</p>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Calendar className="w-4 h-4" />
                        {report.generatedDate}
                      </div>
                      <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold">
                        {report.format}
                      </span>
                    </div>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Download Report
                    </Button>
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
