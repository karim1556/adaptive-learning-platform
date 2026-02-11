"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useRequireAuth } from "@/hooks/use-auth"
import { joinClass } from "@/lib/data-service"
import { supabase } from "@/lib/supabaseClient"
import { BookOpen, ArrowLeft, Users, Check, Loader2 } from "lucide-react"

export default function JoinClassPage() {
  const { user, loading } = useRequireAuth(["student"])
  const router = useRouter()
  const [code, setCode] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState<string | null>(null)
  const [studentName, setStudentName] = useState("")
  const [studentRollNumber, setStudentRollNumber] = useState("")

  useEffect(() => {
    // Get student name and roll number from metadata
    const fetchName = async () => {
      const { data } = await supabase.auth.getUser()
      const meta = data?.user?.user_metadata || {}
      const firstName = meta.studentDetails?.firstName || meta.firstName || ""
      const lastName = meta.studentDetails?.lastName || meta.lastName || ""
      setStudentName(`${firstName} ${lastName}`.trim() || "Student")
      setStudentRollNumber(meta.studentDetails?.rollNumber || "")
    }
    if (user) fetchName()
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  const handleJoin = async () => {
    if (!code.trim()) {
      setError("Please enter a class code")
      return
    }

    setError("")
    setIsJoining(true)

    try {
      const fullName = studentName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Student"
      const result = await joinClass(
        code.trim().toUpperCase(),
        user.id,
        fullName,
        user.email || "",
        undefined,
        studentRollNumber
      )
      if (result.success) {
        setSuccess(result.className || "the class")
        setTimeout(() => {
          router.push("/student/dashboard")
        }, 2000)
      } else {
        setError(result.error || "Could not find that class")
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong")
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={() => router.push("/student/dashboard")}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        {/* Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-blue-500 to-indigo-600">
            <div className="flex items-center gap-3 text-white">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Join a Class</h1>
                <p className="text-blue-100 text-sm">Enter the code from your teacher</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            {success ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Successfully Joined!
                </h2>
                <p className="text-slate-500">You've been added to {success}</p>
                <p className="text-sm text-slate-400 mt-2">Redirecting to dashboard...</p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Class Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase())
                      setError("")
                    }}
                    placeholder="Enter 6-character code"
                    maxLength={6}
                    className="w-full px-4 py-4 text-center text-2xl font-mono font-bold tracking-widest rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none uppercase"
                  />
                  {error && (
                    <p className="text-sm text-red-600 mt-2 text-center">{error}</p>
                  )}
                </div>

                <button
                  onClick={handleJoin}
                  disabled={isJoining || !code.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Users className="w-5 h-5" />
                      Join Class
                    </>
                  )}
                </button>

                <div className="mt-6 text-center">
                  <p className="text-sm text-slate-500">
                    Ask your teacher for the class code to join
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-400">
            Class codes are 6 characters, like <code className="font-mono bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">ABC123</code>
          </p>
        </div>
      </div>
    </div>
  )
}
