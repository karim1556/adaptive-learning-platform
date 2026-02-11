"use client"

import { useRequireAuth } from "@/hooks/use-auth"
import { getAdminData } from "@/lib/admin-data"
import { AdminHeader } from "@/components/admin/header"
import { AdminSidebar } from "@/components/admin/sidebar"
import SeedDemoData from "@/components/admin/seed-demo"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Users, BookOpen, Zap, FolderOpen } from "lucide-react"

export default function AdminDashboard() {
  const { user, loading } = useRequireAuth(["admin"])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const adminData = getAdminData(user.id)

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <AdminSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader user={user} />

        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto">
            {/* Welcome Section */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{adminData.schoolName}</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">School-wide Analytics & Insights</p>
              <div className="mt-2">
                <SeedDemoData />
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    Total Students
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{adminData.totalStudents}</p>
                  <p className="text-xs text-slate-500 mt-1">{adminData.platformMetrics.activeUsers} active today</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-green-600" />
                    Average Mastery
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{adminData.avgMasteryScore.toFixed(1)}%</p>
                  <Progress value={adminData.avgMasteryScore} className="mt-2 h-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-600" />
                    Daily AI Interactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{adminData.platformMetrics.aiInteractionsDaily}</p>
                  <p className="text-xs text-slate-500 mt-1">Across the platform</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-orange-600" />
                    Active Projects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{adminData.platformMetrics.projectsInProgress}</p>
                  <p className="text-xs text-slate-500 mt-1">Project-based learning</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Engagement Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>School Engagement Trend (7 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={adminData.engagementTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="engagement" stroke="#3b82f6" name="Engagement %" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Mastery Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Mastery Score Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={adminData.masteryDistribution}
                        margin={{ top: 10, right: 10, left: -20, bottom: 40 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3b82f6" name="Number of Students" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Teacher Adoption */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Teacher Platform Adoption</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {adminData.teacherAdoption.map((teacher, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{teacher.teacher}</span>
                        <span className="text-sm font-bold">{teacher.adoptionScore}%</span>
                      </div>
                      <Progress value={teacher.adoptionScore} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
