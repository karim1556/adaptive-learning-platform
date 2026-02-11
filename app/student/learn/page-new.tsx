"use client"

import { useState, useEffect } from "react"
import { useRequireAuth } from "@/hooks/use-auth"
import { getAdaptiveContent, type Content, getStudentData, type VARKProfileData } from "@/lib/data-service"
import { StudentHeader } from "@/components/student/header"
import { StudentSidebar } from "@/components/student/sidebar"
import { 
  BookOpen, 
  Video, 
  Headphones, 
  Gamepad2, 
  Filter, 
  Search,
  Play,
  Clock,
  Star,
  Eye,
  Ear,
  BookText,
  Hand,
  ChevronRight
} from "lucide-react"

const VARK_CONFIG = {
  visual: { icon: Eye, color: "bg-blue-500", textColor: "text-blue-600", bgLight: "bg-blue-50", label: "Visual" },
  auditory: { icon: Ear, color: "bg-purple-500", textColor: "text-purple-600", bgLight: "bg-purple-50", label: "Auditory" },
  reading: { icon: BookText, color: "bg-emerald-500", textColor: "text-emerald-600", bgLight: "bg-emerald-50", label: "Reading" },
  kinesthetic: { icon: Hand, color: "bg-amber-500", textColor: "text-amber-600", bgLight: "bg-amber-50", label: "Kinesthetic" },
}

export default function StudentLearnPage() {
  const { user, loading } = useRequireAuth(["student"])
  const [content, setContent] = useState<Content[]>([])
  const [filteredContent, setFilteredContent] = useState<Content[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<string>("all")
  const [varkProfile, setVarkProfile] = useState<{ dominantStyle: string; secondaryStyle: string } | null>(null)

  useEffect(() => {
    if (!user) return

    ;(async () => {
      try {
        const studentData = await getStudentData(user.id)
        if (studentData) {
          setVarkProfile({
            dominantStyle: studentData.varkProfile.dominantStyle,
            secondaryStyle: studentData.varkProfile.secondaryStyle
          })

          const adaptiveContent = await getAdaptiveContent(user.id, studentData.varkProfile)
          setContent(adaptiveContent)
          setFilteredContent(adaptiveContent)
        }
      } catch (e) {
        console.error("Error loading content:", e)
      } finally {
        setIsLoading(false)
      }
    })()
  }, [user?.id])

  useEffect(() => {
    let filtered = content

    if (searchQuery) {
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.conceptName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (activeFilter !== "all") {
      filtered = filtered.filter((c) => c.learningMode === activeFilter)
    }

    setFilteredContent(filtered)
  }, [searchQuery, activeFilter, content])

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <StudentSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <StudentHeader user={user} />

        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* Page Header */}
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Learning Center</h1>
              <p className="text-slate-500 mt-1">
                Content personalized for your {varkProfile?.dominantStyle || "learning"} style
              </p>
            </div>

            {/* VARK Profile Banner */}
            {varkProfile && (
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 text-white">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">Your Learning Styles</h3>
                    <p className="text-blue-100 text-sm mt-1">
                      Content is prioritized for your top 2 styles
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2">
                      {(() => {
                        const config = VARK_CONFIG[varkProfile.dominantStyle as keyof typeof VARK_CONFIG]
                        const Icon = config?.icon || Eye
                        return <Icon className="w-5 h-5" />
                      })()}
                      <span className="font-medium">{varkProfile.dominantStyle}</span>
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded">Primary</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2">
                      {(() => {
                        const config = VARK_CONFIG[varkProfile.secondaryStyle as keyof typeof VARK_CONFIG]
                        const Icon = config?.icon || Ear
                        return <Icon className="w-5 h-5" />
                      })()}
                      <span className="font-medium">{varkProfile.secondaryStyle}</span>
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded">Secondary</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveFilter("all")}
                  className={`px-4 py-2 rounded-xl font-medium transition ${
                    activeFilter === "all"
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  All
                </button>
                {Object.entries(VARK_CONFIG).map(([style, config]) => {
                  const Icon = config.icon
                  return (
                    <button
                      key={style}
                      onClick={() => setActiveFilter(style)}
                      className={`px-4 py-2 rounded-xl font-medium transition flex items-center gap-2 ${
                        activeFilter === style
                          ? `${config.color} text-white`
                          : `${config.bgLight} ${config.textColor}`
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{config.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Content Grid */}
            {filteredContent.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredContent.map((item) => {
                  const styleConfig = VARK_CONFIG[item.learningMode as keyof typeof VARK_CONFIG]
                  const StyleIcon = styleConfig?.icon || BookOpen
                  const difficultyLabel = item.difficulty < 33 ? "Easy" : item.difficulty < 66 ? "Medium" : "Hard"

                  return (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition group"
                    >
                      {/* Card Header */}
                      <div className={`h-2 ${styleConfig?.color || "bg-blue-500"}`} />
                      
                      <div className="p-5">
                        {/* Style Badge */}
                        <div className="flex items-center justify-between mb-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg ${styleConfig?.bgLight || "bg-blue-50"} ${styleConfig?.textColor || "text-blue-600"}`}>
                            <StyleIcon className="w-3.5 h-3.5" />
                            {styleConfig?.label || item.learningMode}
                          </span>
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
                            difficultyLabel === "Easy" ? "bg-emerald-100 text-emerald-700" :
                            difficultyLabel === "Medium" ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {difficultyLabel}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                          {item.title}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                          {item.description}
                        </p>

                        {/* Concept Tag */}
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-xs text-slate-400">Concept:</span>
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                            {item.conceptName || "General"}
                          </span>
                        </div>

                        {/* Action Button */}
                        <button className="w-full flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-2.5 rounded-xl font-medium hover:opacity-90 transition group-hover:bg-blue-600 dark:group-hover:bg-blue-500 dark:group-hover:text-white">
                          <Play className="w-4 h-4" />
                          Start Learning
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                  No content found
                </h3>
                <p className="text-slate-500 max-w-sm mx-auto">
                  {searchQuery || activeFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "Content will appear here once your teacher adds materials"}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
