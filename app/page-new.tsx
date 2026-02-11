"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { 
  BookOpen, 
  Brain, 
  TrendingUp, 
  Users, 
  Zap, 
  Target, 
  ArrowRight, 
  Sparkles,
  CheckCircle,
  Play,
  GraduationCap,
  BarChart3,
  Shield
} from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getUser()
        if (data?.user) {
          const meta = data.user.user_metadata || {}
          setUser({
            ...data.user,
            role: meta.role || "student",
            firstName: meta.firstName || meta.first_name || "",
            lastName: meta.lastName || meta.last_name || ""
          })
        }
      } catch (e) {
        // Not logged in
      } finally {
        setLoading(false)
      }
    }
    checkAuth()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const meta = session.user.user_metadata || {}
        setUser({
          ...session.user,
          role: meta.role || "student",
          firstName: meta.firstName || meta.first_name || "",
          lastName: meta.lastName || meta.last_name || ""
        })
      } else {
        setUser(null)
      }
    })

    return () => {
      listener?.subscription.unsubscribe()
    }
  }, [])

  const getDashboardLink = () => {
    if (!user) return "/login"
    const role = user.role || "student"
    return `/${role}/dashboard`
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">AdaptIQ</span>
          </div>
          
          <div className="flex items-center gap-4">
            {!loading && (
              user ? (
                <Link href={getDashboardLink()}>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    Go to Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              ) : (
                <Link href="/login">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">Sign In</Button>
                </Link>
              )
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-20 md:py-32">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 mb-8">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">AI-Powered Adaptive Learning</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
            Learning That Adapts to{" "}
            <span className="text-blue-600 dark:text-blue-400">You</span>
          </h1>

          <p className="text-xl text-slate-600 dark:text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Every student learns differently. AdaptIQ discovers your learning style and
            adapts content in real-time, making mastery inevitable.
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <Link href={user ? getDashboardLink() : "/login"}>
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20">
                {user ? "Continue Learning" : "Start Learning Free"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-slate-300 dark:border-slate-600">
              <Play className="w-4 h-4 mr-2" />
              Watch Demo
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white dark:bg-slate-800 border-y border-slate-200 dark:border-slate-700 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: "Active Students", value: "245+", icon: Users },
              { label: "Learning Concepts", value: "150+", icon: BookOpen },
              { label: "AI Interactions", value: "450+/day", icon: Zap },
              { label: "Teachers", value: "12+", icon: GraduationCap },
            ].map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{stat.label}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Why Students Love AdaptIQ
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Designed by educators, built for learners
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Brain,
              title: "Your Learning Style",
              description: "Discover your VARK profile and learn in the way that works best for you",
              color: "blue"
            },
            {
              icon: TrendingUp,
              title: "Real Progress",
              description: "Track mastery of each concept with clear, visual progress indicators",
              color: "emerald"
            },
            {
              icon: Zap,
              title: "AI Tutor",
              description: "Get instant help explaining concepts exactly how you learn best",
              color: "purple"
            },
            {
              icon: Target,
              title: "Personalized Path",
              description: "Content adapts to your current level, never bored or overwhelmed",
              color: "amber"
            },
            {
              icon: Users,
              title: "Learn Together",
              description: "Collaborate on projects while maintaining your individual learning journey",
              color: "rose"
            },
            {
              icon: BookOpen,
              title: "Project-Based",
              description: "Apply learning to real projects and build a portfolio of your work",
              color: "cyan"
            },
          ].map((feature) => {
            const Icon = feature.icon
            const colorClasses: Record<string, string> = {
              blue: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
              emerald: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
              purple: "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
              amber: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
              rose: "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400",
              cyan: "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400",
            }
            
            return (
              <div
                key={feature.title}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow"
              >
                <div className={`w-12 h-12 rounded-xl ${colorClasses[feature.color]} flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Roles Section */}
      <div className="bg-slate-100 dark:bg-slate-800/50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Built for Everyone
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              Supporting the complete learning ecosystem
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                role: "Students",
                features: [
                  "Personalized learning paths",
                  "AI tutoring on demand",
                  "Progress tracking",
                  "Peer collaboration",
                ],
                icon: BookOpen,
                color: "blue",
                link: "/login"
              },
              {
                role: "Teachers",
                features: ["Class analytics", "Student insights", "Learning patterns", "Engagement alerts"],
                icon: Users,
                color: "indigo",
                link: "/login"
              },
              {
                role: "Parents",
                features: ["Progress reports", "Clear explanations", "Support tips", "Peace of mind"],
                icon: Shield,
                color: "emerald",
                link: "/login"
              },
              {
                role: "Admins",
                features: ["School metrics", "Teacher adoption", "Engagement trends", "System health"],
                icon: BarChart3,
                color: "purple",
                link: "/login"
              },
            ].map((item) => {
              const Icon = item.icon
              const gradients: Record<string, string> = {
                blue: "from-blue-500 to-blue-600",
                indigo: "from-indigo-500 to-indigo-600",
                emerald: "from-emerald-500 to-emerald-600",
                purple: "from-purple-500 to-purple-600",
              }
              
              return (
                <div
                  key={item.role}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradients[item.color]} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{item.role}</h3>
                  <ul className="space-y-2">
                    {item.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-slate-600 dark:text-slate-400 text-sm">
                        <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-3xl p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Learning?
          </h2>
          <p className="text-blue-100 mb-8 text-lg max-w-2xl mx-auto">
            Join hundreds of students discovering how to learn faster, smarter, and better.
          </p>
          <Link href={user ? getDashboardLink() : "/login"}>
            <Button size="lg" className="bg-white text-blue-700 hover:bg-slate-100 font-semibold shadow-lg">
              {user ? "Go to Dashboard" : "Start Free Today"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-slate-900 dark:text-white">AdaptIQ</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Where personalized learning meets AI. Building the future of education.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/help" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600">
                Help
              </Link>
              <Link href="/login" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
