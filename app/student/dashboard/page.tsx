"use client"

import { useRequireAuth } from "@/hooks/use-auth"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { MasteryBadges } from "@/components/student/mastery-badges"
import { ProgressShareCard } from "@/components/student/progress-share-card"
import { getStudentBadges, buildAchievementShareText, syncStudentBadges, type MasteryBadge } from "@/lib/student-achievements"
import { StudentHeader } from "@/components/student/header-new"
import { StudentSidebar } from "@/components/student/sidebar-new"
import { 
  getAllStudentProgress, 
  getPublishedLessons,
  getStudentMastery,
  type LessonProgress,
  type StudentMasteryData
} from "@/lib/lesson-service"
import { updateStudentInClasses } from "@/lib/data-service"
import { deriveStudentMetrics } from "@/lib/student-metrics"
import { 
  TrendingUp, 
  Zap, 
  Target, 
  BookOpen, 
  ChevronRight,
  Sparkles,
  Clock,
  ArrowUpRight,
  Eye,
  Ear,
  BookText,
  Hand,
  CheckCircle,
  Play,
  Copy,
  ExternalLink
} from "lucide-react"
import type { StudentDashboardData } from "@/lib/student-data"
import Link from "next/link"
import ManimPromptModal from '@/components/ui/manim-prompt-modal'

// VARK style icons
const VARK_ICONS = {
  visual: Eye,
  auditory: Ear,
  reading: BookText,
  kinesthetic: Hand,
}

const VARK_COLORS = {
  visual: "bg-blue-500",
  auditory: "bg-purple-500",
  reading: "bg-emerald-500",
  kinesthetic: "bg-amber-500",
}

function getMasteryLevel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Strong", color: "text-emerald-600 bg-emerald-50" }
  if (score >= 60) return { label: "Proficient", color: "text-blue-600 bg-blue-50" }
  if (score >= 40) return { label: "Developing", color: "text-amber-600 bg-amber-50" }
  return { label: "Needs Support", color: "text-red-600 bg-red-50" }
}

function getEngagementLevel(score: number): { label: string; color: string } {
  if (score > 70) return { label: "High", color: "text-emerald-600" }
  if (score >= 40) return { label: "Medium", color: "text-amber-600" }
  return { label: "Low", color: "text-red-600" }
}

export default function StudentDashboard() {
  const { user, loading } = useRequireAuth(["student"])
  const router = useRouter()
  const [studentData, setStudentData] = useState<StudentDashboardData | null>(null)
  const [lessonProgress, setLessonProgress] = useState<LessonProgress[]>([])
  const [masteryData, setMasteryData] = useState<StudentMasteryData[]>([])
  const [totalLessons, setTotalLessons] = useState(0)
  const [allLessons, setAllLessons] = useState<any[]>([])
  const [studentDetails, setStudentDetails] = useState<any | null>(null)
  const [badges, setBadges] = useState<MasteryBadge[]>([])
  const [shareStatus, setShareStatus] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    if (!user) return

    const loadData = async () => {
      try {
        // Get user metadata for VARK profile
        const { data: authData } = await supabase.auth.getUser()
        const meta = (authData?.user?.user_metadata || {}) as any
        console.log("Dashboard: User metadata:", meta)
        const varkMeta = meta.varkProfile || null
        const joinedClasses = meta.joinedClasses || []
        setStudentDetails(meta.studentDetails || null)
        
        // Update student info in all enrolled classes (sync name/rollNumber)
        const studentDetails = meta.studentDetails
        console.log("Dashboard: Student details:", studentDetails)
        console.log("Dashboard: User ID:", user.id)
        
        // Also check localStorage
        const storedUser = localStorage.getItem("user")
        if (storedUser) {
          const localUser = JSON.parse(storedUser)
          console.log("Dashboard: localStorage user:", localUser)
          if (localUser.studentDetails?.firstName && localUser.studentDetails?.lastName) {
            const fullName = `${localUser.studentDetails.firstName} ${localUser.studentDetails.lastName}`.trim()
            console.log("Dashboard: Updating student in classes with name:", fullName)
            await updateStudentInClasses(localUser.id || user.id, fullName, localUser.studentDetails.rollNumber)
          }
        } else if (studentDetails?.firstName && studentDetails?.lastName) {
          const fullName = `${studentDetails.firstName} ${studentDetails.lastName}`.trim()
          console.log("Dashboard: Updating from Supabase meta with name:", fullName)
          await updateStudentInClasses(user.id, fullName, studentDetails.rollNumber)
        }

        // Try to get profile from database
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle()

        const resolvedVark = profile?.vark_profile || varkMeta || null

        // Get lesson progress and mastery data
        const [progressData, allLessons, mastery] = await Promise.all([
          getAllStudentProgress(user.id),
          getPublishedLessons(),
          getStudentMastery(user.id)
        ])

        if (!mounted) return

        const metrics = deriveStudentMetrics({
          progress: progressData,
          lessons: allLessons,
          fallbackMastery: profile?.overall_mastery || 0,
          fallbackEngagement: profile?.engagement_index || 50,
        })

        const masteryForDisplay = mastery.length > 0
          ? mastery
          : metrics.masteryByTopic.map((topic) => ({
              conceptId: topic.conceptId,
              conceptName: topic.conceptName,
              masteryScore: topic.masteryScore,
              checkpointsPassed: topic.checkpointsPassed,
              totalCheckpoints: topic.totalCheckpoints,
              lessonsCompleted: topic.lessonsCompleted,
              totalLessons: topic.totalLessons,
              lastActivity: topic.lastActivity,
              needsAttention: topic.needsAttention,
            }))

        const mapped: StudentDashboardData = {
          studentId: user.id,
          name: profile?.full_name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Student",
          currentClass: "",
          overallMasteryScore: metrics.overallMastery,
          engagementIndex: metrics.engagementIndex,
          vark: resolvedVark ? {
            visual: resolvedVark.scores?.visual || resolvedVark.visual || 25,
            auditory: resolvedVark.scores?.auditory || resolvedVark.auditory || 25,
            reading: resolvedVark.scores?.reading || resolvedVark.reading || 25,
            kinesthetic: resolvedVark.scores?.kinesthetic || resolvedVark.kinesthetic || 25,
            dominantStyle: resolvedVark.dominantStyle || resolvedVark.dominant_style || "",
            secondaryStyle: resolvedVark.secondaryStyle || resolvedVark.secondary_style || "",
          } : {
            visual: 25, auditory: 25, reading: 25, kinesthetic: 25,
            dominantStyle: "", secondaryStyle: "",
          },
          masteryByTopic: masteryForDisplay.map(m => ({
            topicId: m.conceptId,
            topicName: m.conceptName,
            score: m.masteryScore,
            assessmentCount: m.totalCheckpoints,
            trend: "stable" as const
          })),
          recentActivity: progressData.slice(0, 5).map(p => ({
            id: p.lessonId,
            type: "lesson" as const,
            description: p.completedAt ? `${p.lessonTitle}: completed with ${p.overallScore}%` : `${p.lessonTitle}: in progress`,
            timestamp: new Date(p.lastAccessedAt),
          })),
          classes: joinedClasses,
        }

        const computedBadges = getStudentBadges({
          studentId: user.id,
          lessons: allLessons,
          lessonProgress: progressData,
          masteryData: masteryForDisplay,
          dominantStyle: resolvedVark?.dominantStyle || resolvedVark?.dominant_style || "",
        })

        setStudentData(mapped)
        setLessonProgress(progressData)
        setMasteryData(masteryForDisplay)
        setAllLessons(allLessons)
        setTotalLessons(allLessons.length)
        setBadges(computedBadges)
        await syncStudentBadges(user.id, computedBadges)
        setIsLoading(false)
      } catch (e) {
        console.warn("Error loading dashboard:", e)
        setIsLoading(false)
      }
    }

    loadData()

    // Listen for progress updates
    const handleProgressUpdate = () => {
      console.log("Dashboard: Progress updated, reloading data")
      loadData()
    }
    window.addEventListener("progress:updated", handleProgressUpdate)

    return () => { 
      mounted = false
      window.removeEventListener("progress:updated", handleProgressUpdate)
    }
  }, [user?.id])

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user || !studentData) return null

  const masteryStatus = getMasteryLevel(studentData.overallMasteryScore)
  const engagementStatus = getEngagementLevel(studentData.engagementIndex)
  const achievementShareText = buildAchievementShareText({
    studentName: studentData.name,
    badges,
    overallMastery: studentData.overallMasteryScore,
  })

  const openTweetComposer = async () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(achievementShareText)}`
    window.open(url, "_blank", "noopener,noreferrer")
    setShareStatus("Tweet composer opened with your latest mastery highlight.")
  }

  const copyLinkedInSnippet = async () => {
    await navigator.clipboard.writeText(achievementShareText)
    window.open("https://www.linkedin.com/feed/", "_blank", "noopener,noreferrer")
    setShareStatus("LinkedIn-ready snippet copied. Paste it into your new post.")
  }

  const handleShareBadges = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "AMEP Achievement",
          text: achievementShareText,
        })
        setShareStatus("Achievement snippet shared.")
        return
      } catch {
        // fall through to copy + tweet
      }
    }

    await navigator.clipboard.writeText(achievementShareText)
    await openTweetComposer()
  }

  return (
    <div className="flex min-h-[100dvh] bg-slate-50 dark:bg-slate-900">
      <StudentSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <StudentHeader user={user} />

        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl space-y-6 px-4 pb-28 pt-4 sm:px-6 sm:pt-6 lg:pb-6">
            {/* Welcome */}
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Welcome back, {studentData.name.split(" ")[0]}!
                </h1>
                <p className="text-slate-500 mt-1">
                  Here's your personalized learning overview
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {studentData.classes && studentData.classes.length > 0 && (
                  <div className="flex gap-2">
                    {studentData.classes.slice(0, 2).map((c: any) => (
                      <span key={c.classCode} className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm font-medium rounded-lg">
                        {c.className || c.classCode}
                      </span>
                    ))}
                  </div>
                )}
                <ManimPromptModal />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Mastery Score */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${masteryStatus.color}`}>
                    {masteryStatus.label}
                  </span>
                </div>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                  {studentData.overallMasteryScore}%
                </div>
                <p className="text-sm text-slate-500 mt-1">Overall Mastery</p>
                <div className="mt-4 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
                    style={{ width: `${studentData.overallMasteryScore}%` }}
                  />
                </div>
              </div>

              {/* Engagement */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                    <Zap className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className={`text-sm font-medium ${engagementStatus.color}`}>
                    {engagementStatus.label}
                  </span>
                </div>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                  {studentData.engagementIndex}%
                </div>
                <p className="text-sm text-slate-500 mt-1">Engagement Index</p>
                <div className="mt-4 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                    style={{ width: `${studentData.engagementIndex}%` }}
                  />
                </div>
              </div>

              {/* Next Goal */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-blue-200" />
                </div>
                <div className="text-lg font-semibold">Next Goal</div>
                <p className="text-blue-100 text-sm mt-1">
                  {studentData.masteryByTopic[0]?.topicName || "Start learning to set goals"}
                </p>
                <div className="mt-4">
                  <span className="text-3xl font-bold">+15</span>
                  <span className="text-blue-200 text-sm ml-1">points to mastery</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Topics & Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Topic Mastery */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <h2 className="font-semibold text-slate-900 dark:text-white">Topic Mastery</h2>
                    <Link href="/student/grades" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                      View all <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                  <div className="p-5 space-y-4">
                    {studentData.masteryByTopic.length > 0 ? (
                      studentData.masteryByTopic.slice(0, 4).map((topic, i) => {
                        const status = getMasteryLevel(topic.score)
                        return (
                          <div key={topic.topicId || i} className="flex items-center gap-4">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-sm font-medium text-slate-900 dark:text-white">
                                  {topic.topicName}
                                </span>
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                  {topic.score}%
                                </span>
                              </div>
                              <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${
                                    topic.score >= 80 ? "bg-emerald-500" :
                                    topic.score >= 60 ? "bg-blue-500" :
                                    topic.score >= 40 ? "bg-amber-500" : "bg-red-500"
                                  }`}
                                  style={{ width: `${topic.score}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                        <p>No topics yet. Start learning to track your progress!</p>
                        <Link href="/student/learn">
                          <button className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
                            Start Learning
                          </button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recommended Content */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      <h2 className="font-semibold text-slate-900 dark:text-white">Recommended for You</h2>
                    </div>
                    <Link href="/student/learn" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                      See all <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                  <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Placeholder recommended items based on VARK */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-6 h-6 ${VARK_COLORS[studentData.vark.dominantStyle.toLowerCase() as keyof typeof VARK_COLORS] || "bg-blue-500"} rounded-md flex items-center justify-center text-white text-xs`}>
                          {studentData.vark.dominantStyle?.[0] || "V"}
                        </span>
                        <span className="text-xs text-slate-500 capitalize">{studentData.vark.dominantStyle || "Visual"}</span>
                      </div>
                      <h3 className="font-medium text-slate-900 dark:text-white text-sm">Interactive Concept Maps</h3>
                      <p className="text-xs text-slate-500 mt-1">Visual breakdown of key concepts</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-6 h-6 ${VARK_COLORS[studentData.vark.secondaryStyle.toLowerCase() as keyof typeof VARK_COLORS] || "bg-purple-500"} rounded-md flex items-center justify-center text-white text-xs`}>
                          {studentData.vark.secondaryStyle?.[0] || "A"}
                        </span>
                        <span className="text-xs text-slate-500 capitalize">{studentData.vark.secondaryStyle || "Auditory"}</span>
                      </div>
                      <h3 className="font-medium text-slate-900 dark:text-white text-sm">Audio Explanations</h3>
                      <p className="text-xs text-slate-500 mt-1">Listen and learn on the go</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - VARK & Activity */}
              <div className="space-y-6">
                <MasteryBadges badges={badges} onShare={handleShareBadges} />

                {/* VARK Profile */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                  <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Your Learning Style</h2>
                  
                  {studentData.vark.dominantStyle ? (
                    <>
                      <div className="flex gap-2 mb-4">
                        <span className={`px-3 py-1.5 ${VARK_COLORS[studentData.vark.dominantStyle.toLowerCase() as keyof typeof VARK_COLORS] || "bg-blue-500"} text-white text-sm font-medium rounded-lg`}>
                          {studentData.vark.dominantStyle}
                        </span>
                        <span className={`px-3 py-1.5 ${VARK_COLORS[studentData.vark.secondaryStyle.toLowerCase() as keyof typeof VARK_COLORS] || "bg-purple-500"} text-white text-sm font-medium rounded-lg opacity-75`}>
                          {studentData.vark.secondaryStyle}
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        {Object.entries(studentData.vark)
                          .filter(([key]) => ["visual", "auditory", "reading", "kinesthetic"].includes(key))
                          .sort(([, a], [, b]) => (b as number) - (a as number))
                          .map(([style, score]) => {
                            const Icon = VARK_ICONS[style as keyof typeof VARK_ICONS]
                            return (
                              <div key={style} className="flex items-center gap-3">
                                <div className={`w-8 h-8 ${VARK_COLORS[style as keyof typeof VARK_COLORS]} rounded-lg flex items-center justify-center`}>
                                  <Icon className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm capitalize text-slate-700 dark:text-slate-300">{style}</span>
                                    <span className="text-sm font-medium text-slate-900 dark:text-white">{score as number}%</span>
                                  </div>
                                  <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full ${VARK_COLORS[style as keyof typeof VARK_COLORS]} rounded-full`}
                                      style={{ width: `${score as number}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-slate-500 text-sm mb-3">Complete the VARK survey to discover your learning style</p>
                      <Link href="/student/vark-survey">
                        <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
                          Take Survey
                        </button>
                      </Link>
                    </div>
                  )}
                </div>

                <ProgressShareCard
                  studentId={user.id}
                  parentEmail={studentDetails?.parentEmail}
                  parentName={studentDetails?.parentName}
                  studentSnapshot={{
                    studentName: studentData.name,
                    overallMastery: studentData.overallMasteryScore,
                    engagementLevel: studentData.engagementIndex,
                    dominantStyle: studentData.vark.dominantStyle,
                    masteryByTopic: studentData.masteryByTopic.map((topic) => ({
                      topicName: topic.topicName,
                      score: topic.score,
                    })),
                    badges: badges.filter((badge) => badge.earned).map((badge) => ({ name: badge.name })),
                    recentActivity: studentData.recentActivity.map((activity) => ({
                      description: activity.description,
                      timestamp: activity.timestamp.toISOString(),
                    })),
                  }}
                />

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-slate-900 dark:text-white">Achievement Social Sharer</h2>
                      <p className="text-sm text-slate-500 mt-1">Generate a tweetable or LinkedIn-ready mastery update.</p>
                    </div>
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">#AdaptiveMastery</span>
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 p-4 text-sm text-slate-700 dark:text-slate-300">
                    {achievementShareText}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={openTweetComposer}
                      className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Share to X
                    </button>
                    <button
                      type="button"
                      onClick={copyLinkedInSnippet}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <Copy className="w-4 h-4" />
                      Copy for LinkedIn
                    </button>
                  </div>

                  {shareStatus && <p className="mt-3 text-sm text-emerald-600">{shareStatus}</p>}
                </div>

                {/* Recent Activity */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                  <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Recent Activity</h2>
                  
                  {studentData.recentActivity && studentData.recentActivity.length > 0 ? (
                    <div className="space-y-3">
                      {studentData.recentActivity.slice(0, 5).map((activity, i) => (
                        <div key={activity.id || i} className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Clock className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-900 dark:text-white truncate">{activity.description}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(activity.timestamp).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-slate-500 text-sm py-4">
                      No recent activity. Start learning!
                    </p>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white">
                  <h3 className="font-semibold mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    <Link href="/student/lessons">
                      <button className="w-full text-left px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition flex items-center gap-3">
                        <BookOpen className="w-5 h-5 text-blue-400" />
                        <span className="text-sm">Browse Lessons</span>
                      </button>
                    </Link>
                    <Link href="/student/chat">
                      <button className="w-full text-left px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-amber-400" />
                        <span className="text-sm">Ask AI Tutor</span>
                      </button>
                    </Link>
                  </div>
                </div>

                {/* Lessons Progress */}
                {lessonProgress.length > 0 && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Continue Learning</h3>
                      <Link href="/student/lessons" className="text-xs text-blue-600 hover:text-blue-700">
                        View All
                      </Link>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                      {lessonProgress.filter(p => !p.completedAt).slice(0, 3).map((p) => (
                        <Link key={p.lessonId} href={`/student/lessons/${p.lessonId}`}>
                          <div className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.lessonTitle}</h4>
                              <Play className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${Math.round((p.completedBlocks.length / Math.max(1, p.currentBlockIndex + 1)) * 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-500">{p.overallScore}%</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
