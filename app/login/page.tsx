"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { getDashboardRoute } from "@/lib/auth"
import { GraduationCap, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react"

type RoleTab = "student" | "teacher" | "parent" | "admin"
type AuthMode = "signin" | "signup"

const ROLES = [
  { id: "student" as const, label: "Student", description: "Learn & grow" },
  { id: "teacher" as const, label: "Teacher", description: "Manage classes" },
  { id: "parent" as const, label: "Parent", description: "Track progress" },
  { id: "admin" as const, label: "Admin", description: "Institute management" },
]

export default function LoginPage() {
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<RoleTab>("student")
  const [authMode, setAuthMode] = useState<AuthMode>("signin")
  const [successMessage, setSuccessMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccessMessage("")
    setLoading(true)

    try {
      if (authMode === "signin") {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
        
        if (authError) {
          setError(authError.message)
          setLoading(false)
          return
        }

        const sUser = data.user
        const meta = (sUser?.user_metadata || {}) as Record<string, any>
        const storedRole = (meta.role || meta.roleName || "").toString().toLowerCase()
        const selected = selectedRole.toLowerCase()

        // Validate role if stored
        if (storedRole && storedRole !== selected) {
          await supabase.auth.signOut()
          document.cookie = `adaptiq_role=; path=/; max-age=0`
          setError("This account is registered as a different role.")
          setLoading(false)
          return
        }

        // Set role cookie and metadata
        const finalRole = storedRole || selected
        document.cookie = `adaptiq_role=${finalRole}; path=/; max-age=${60 * 60 * 24 * 30}`
        
        if (!storedRole) {
          await supabase.auth.updateUser({ data: { role: selected } })
        }

        // Navigate to dashboard
        const varkComplete = meta.varkComplete || false
        const nextRoute = getDashboardRoute(finalRole as any, varkComplete)
        router.push(finalRole === "student" && !varkComplete ? "/student/vark-survey" : nextRoute)
      } else {
        // Sign up
        // Prevent admin signup through the public signup flow
        if (selectedRole === "admin") {
          setError("Admin accounts cannot be created via public signup. Use the seeded admin or contact your institute.")
          setLoading(false)
          return
        }
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { role: selectedRole }, redirectTo: SITE_URL, emailRedirectTo: SITE_URL }
        })

        if (authError) {
          setError(authError.message)
          setLoading(false)
          return
        }

        if (data.user && !data.session) {
          setSuccessMessage("Check your email to confirm your account!")
          setLoading(false)
          return
        }

        // Auto sign in after signup
        document.cookie = `adaptiq_role=${selectedRole}; path=/; max-age=${60 * 60 * 24 * 30}`
        const nextRoute = selectedRole === "student" ? "/student/vark-survey" : getDashboardRoute(selectedRole, false)
        router.push(nextRoute)
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">AdaptIQ</span>
          </div>
        </div>
        
        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Personalized Learning,<br />Powered by AI
          </h1>
          <p className="text-blue-100 text-lg max-w-md">
            Adaptive content tailored to how you learn best. Track progress, master concepts, and achieve your goals.
          </p>
          
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="bg-white/10 rounded-xl p-4">
              <div className="text-3xl font-bold text-white">VARK</div>
              <p className="text-blue-100 text-sm mt-1">Learning styles adapted to you</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <div className="text-3xl font-bold text-white">AI</div>
              <p className="text-blue-100 text-sm mt-1">Smart tutoring assistance</p>
            </div>
          </div>
        </div>
        
        <p className="text-blue-200 text-sm">
          © 2024 AdaptIQ. All rights reserved.
        </p>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">AdaptIQ</span>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {authMode === "signin" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              {authMode === "signin" 
                ? "Sign in to continue your learning journey" 
                : "Start your personalized learning experience"}
            </p>
          </div>

          {/* Role Selection */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {ROLES.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRole(role.id)}
                className={`p-4 rounded-xl border-2 transition-all text-center ${
                  selectedRole === role.id
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                }`}
              >
                <div className={`text-sm font-semibold ${
                  selectedRole === role.id ? "text-blue-600" : "text-slate-900 dark:text-white"
                }`}>
                  {role.label}
                </div>
                <div className="text-xs text-slate-500 mt-1">{role.description}</div>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full pl-11 pr-12 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
            {successMessage && (
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {authMode === "signin" ? "Sign In" : "Create Account"}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Toggle auth mode */}
          <p className="mt-6 text-center text-slate-600 dark:text-slate-400">
            {authMode === "signin" ? (
              <>
                Don't have an account?{" "}
                <button
                  onClick={() => { setAuthMode("signup"); setError(""); setSuccessMessage(""); }}
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => { setAuthMode("signin"); setError(""); setSuccessMessage(""); }}
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Sign in
                </button>
              </>
            )}
          </p>

          {authMode === "signin" && (
            <div className="mt-4 text-center">
              <button
                onClick={() => router.push("/reset-password")}
                className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Forgot your password?
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
