"use client"

import { useState, useEffect } from "react"
import { useRequireAuth } from "@/hooks/use-auth"
import { AdminSidebar } from "@/components/admin/sidebar"
import { AdminHeader } from "@/components/admin/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Activity,
  Download,
  RefreshCw,
  Building,
  BookOpen,
  Award,
  GraduationCap,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  ChevronRight
} from "lucide-react"
import {
  calculateInstitutionalMetrics,
  getDepartmentMetrics,
  exportMetricsToCSV,
  type InstitutionalMetrics,
  type DepartmentMetrics
} from "@/lib/institutional-metrics"

export default function AdminMetricsPage() {
  const { user, loading: isLoading } = useRequireAuth(["admin"])
  const [metrics, setMetrics] = useState<InstitutionalMetrics | null>(null)
  const [departmentMetrics, setDepartmentMetrics] = useState<DepartmentMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null)

  async function loadMetrics() {
    setLoading(true)
    try {
      const [metricsData, deptData] = await Promise.all([
        calculateInstitutionalMetrics(),
        getDepartmentMetrics()
      ])
      setMetrics(metricsData)
      setDepartmentMetrics(deptData)
    } catch (error) {
      console.error("Failed to load metrics:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadMetrics()
    }
  }, [user])

  async function handleExport() {
    if (!metrics) return
    try {
      const csv = exportMetricsToCSV(metrics)
      // Download the CSV
      const blob = new Blob([csv], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `institutional-metrics-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to export:", error)
    }
  }

  function getScoreColor(score: number): string {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  function getScoreBg(score: number): string {
    if (score >= 80) return "bg-green-50 dark:bg-green-900/20 border-green-200"
    if (score >= 60) return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200"
    return "bg-red-50 dark:bg-red-900/20 border-red-200"
  }

  function getTrendIcon(trend: number | undefined): React.ReactNode {
    if (trend === undefined) return null
    if (trend > 0) {
      return <TrendingUp className="w-4 h-4 text-green-500" />
    }
    if (trend < 0) {
      return <TrendingDown className="w-4 h-4 text-red-500" />
    }
    return null
  }

  // Calculate trend from trends array
  function calculateTrendChange(trendKey: 'mastery' | 'engagement' | 'activeUsers'): number {
    if (!metrics?.trends || metrics.trends.length < 2) return 0
    const recent = metrics.trends[metrics.trends.length - 1][trendKey]
    const previous = metrics.trends[Math.max(0, metrics.trends.length - 8)][trendKey]
    return recent - previous
  }

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || !metrics) return null

  const coreMetrics = [
    {
      id: "masteryRate",
      title: "Mastery Rate",
      value: metrics.masteryRate,
      icon: Target,
      description: "Students achieving mastery across subjects",
      trend: calculateTrendChange('mastery')
    },
    {
      id: "teacherAdoption",
      title: "Teacher Adoption",
      value: metrics.teacherAdoptionRate,
      icon: Users,
      description: "Teachers actively using the platform",
      trend: 0
    },
    {
      id: "confidence",
      title: "Admin Confidence",
      value: metrics.adminConfidenceScore,
      icon: Award,
      description: "Overall platform health score",
      trend: 0
    }
  ]

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader user={user} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                  <BarChart3 className="w-8 h-8 text-indigo-600" />
                  Institutional Metrics
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  Platform-wide performance analytics and insights
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={loadMetrics}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                <Button onClick={handleExport} className="bg-indigo-600 hover:bg-indigo-700">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Core Metrics */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {coreMetrics.map((metric) => {
                const Icon = metric.icon
                return (
                  <Card key={metric.id} className={getScoreBg(metric.value)}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                          <Icon className={`w-6 h-6 ${getScoreColor(metric.value)}`} />
                        </div>
                        <div className="flex items-center gap-1">
                          {getTrendIcon(metric.trend)}
                          <span className="text-sm text-slate-500">vs last month</span>
                        </div>
                      </div>
                      <div className="text-3xl font-bold mb-2">{metric.value}%</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {metric.title}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{metric.description}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Detailed Metrics Grid */}
            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              {/* Engagement Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-600" />
                    Engagement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>Daily Active Users</span>
                      <span className="font-semibold">{metrics.usageMetrics.dailyActiveUsers}</span>
                    </div>
                    <Progress value={Math.min(100, metrics.usageMetrics.dailyActiveUsers / 2)} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>Weekly Active Users</span>
                      <span className="font-semibold">{metrics.usageMetrics.weeklyActiveUsers}</span>
                    </div>
                    <Progress value={Math.min(100, metrics.usageMetrics.weeklyActiveUsers / 5)} className="h-2" />
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Avg. Session Duration</span>
                      <span className="font-semibold">{metrics.usageMetrics.avgSessionDuration} min</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">AI Chat Sessions</span>
                      <Badge className="bg-indigo-100 text-indigo-800">
                        {metrics.usageMetrics.aiChatSessions}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Student Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-indigo-600" />
                    Learning Outcomes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>Active Students</span>
                      <span className="font-semibold">{metrics.studentMetrics.activeStudents} / {metrics.studentMetrics.totalStudents}</span>
                    </div>
                    <Progress value={(metrics.studentMetrics.activeStudents / Math.max(1, metrics.studentMetrics.totalStudents)) * 100} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>Average Mastery</span>
                      <span className="font-semibold">{metrics.studentMetrics.averageMastery}%</span>
                    </div>
                    <Progress value={metrics.studentMetrics.averageMastery} className="h-2" />
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Average Engagement</span>
                      <Badge className={getScoreColor(metrics.studentMetrics.averageEngagement)}>
                        {metrics.studentMetrics.averageEngagement}%
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">At-Risk Students</span>
                      <Badge className="bg-red-100 text-red-800">
                        {metrics.studentMetrics.atRiskCount}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Platform Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                    Platform Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="text-2xl font-bold text-indigo-600">
                        {metrics.studentMetrics.totalStudents}
                      </div>
                      <div className="text-xs text-slate-500">Students</div>
                    </div>
                    <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="text-2xl font-bold text-indigo-600">
                        {metrics.teacherMetrics.totalTeachers}
                      </div>
                      <div className="text-xs text-slate-500">Teachers</div>
                    </div>
                    <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="text-2xl font-bold text-indigo-600">
                        {metrics.teacherMetrics.lessonsCreated}
                      </div>
                      <div className="text-xs text-slate-500">Lessons</div>
                    </div>
                    <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="text-2xl font-bold text-indigo-600">
                        {metrics.teacherMetrics.projectsCreated}
                      </div>
                      <div className="text-xs text-slate-500">Projects</div>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span>Avg Class Size</span>
                      <span className="font-semibold">{metrics.teacherMetrics.averageClassSize}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Departments & Insights */}
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              {/* Department Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5 text-indigo-600" />
                    Department Performance
                  </CardTitle>
                  <CardDescription>
                    Compare metrics across departments
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {departmentMetrics.map((dept) => (
                    <div 
                      key={dept.department}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedDepartment === dept.department 
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" 
                          : "hover:border-indigo-300"
                      }`}
                      onClick={() => setSelectedDepartment(
                        selectedDepartment === dept.department ? null : dept.department
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{dept.department}</h4>
                        <ChevronRight className={`w-4 h-4 transition-transform ${
                          selectedDepartment === dept.department ? "rotate-90" : ""
                        }`} />
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <span>{dept.teacherCount} teachers</span>
                        <span>{dept.studentCount} students</span>
                        <Badge className={getScoreColor(dept.averageMastery)}>
                          {dept.averageMastery}% mastery
                        </Badge>
                      </div>
                      {selectedDepartment === dept.department && (
                        <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-3">
                          <div className="text-center p-2 bg-white dark:bg-slate-800 rounded">
                            <div className="text-lg font-bold text-indigo-600">{dept.averageEngagement}%</div>
                            <div className="text-xs text-slate-500">Avg Engagement</div>
                          </div>
                          <div className="text-center p-2 bg-white dark:bg-slate-800 rounded">
                            <div className="text-lg font-bold text-indigo-600">{dept.adoptionRate}%</div>
                            <div className="text-xs text-slate-500">Adoption Rate</div>
                          </div>
                          <div className="col-span-2">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span>Adoption Rate</span>
                              <span>{dept.adoptionRate}%</span>
                            </div>
                            <Progress value={dept.adoptionRate} className="h-2" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Insights & Recommendations */}
              <div className="space-y-6">
                {/* Insights */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-yellow-500" />
                      Key Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {metrics.insights.map((insight, idx) => (
                      <div 
                        key={idx} 
                        className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border-l-4 border-indigo-500"
                      >
                        <div className="flex items-start gap-2">
                          <Activity className="w-4 h-4 text-indigo-500 mt-0.5" />
                          <p className="text-sm">{insight}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Recommendations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {metrics.recommendations.map((rec, idx) => (
                      <div 
                        key={idx}
                        className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500"
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-green-500 mt-0.5" />
                          <p className="text-sm">{rec}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Trends Chart Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  30-Day Trends
                </CardTitle>
                <CardDescription>
                  Mastery and engagement trends over the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                  <div className="text-center text-slate-500">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Trend chart visualization</p>
                    <p className="text-xs">{metrics.trends.length} data points available</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Last Updated */}
            <div className="mt-6 text-center text-sm text-slate-500">
              Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
