"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import type { User, UserRole } from "@/lib/auth"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    // Fetch current supabase user and map to app User shape
    ;(async () => {
      try {
        const { data } = await supabase.auth.getUser()
        const sUser = data?.user
        if (mounted && sUser) {
          const meta = (sUser.user_metadata || {}) as any
          setUser({
            id: sUser.id,
            email: sUser.email || "",
            firstName: meta.firstName || meta.first_name || "",
            lastName: meta.lastName || meta.last_name || "",
            role: (meta.role as UserRole) || ("student" as UserRole),
            department: (meta.department as string) || undefined,
            teacherProfileComplete: (meta.teacherProfileComplete === true) || false,
          })
        }
      } catch (e) {
        // ignore and continue as unauthenticated
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const sUser = session?.user
      if (sUser) {
        const meta = (sUser.user_metadata || {}) as any
        setUser({
          id: sUser.id,
          email: sUser.email || "",
          firstName: meta.firstName || meta.first_name || "",
          lastName: meta.lastName || meta.last_name || "",
          role: (meta.role as UserRole) || ("student" as UserRole),
          department: (meta.department as string) || undefined,
          teacherProfileComplete: (meta.teacherProfileComplete === true) || false,
        })
      } else {
        setUser(null)
      }
    })

    return () => {
      mounted = false
      // unsubscribe listener
      // @ts-ignore - subscription typing varies by supabase version
      listener?.subscription?.unsubscribe?.()
    }
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.push("/login")
  }

  return { user, loading, logout, isAuthenticated: !!user }
}

export function useRequireAuth(requiredRoles?: UserRole[]) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push("/login")
      return
    }

    if (requiredRoles && !requiredRoles.includes(user.role)) {
      router.push("/login")
      return
    }

    // VARK completion guard: read varkComplete from Supabase user metadata
    ;(async () => {
      try {
        const { data } = await supabase.auth.getUser()
        const varkComplete = (data?.user?.user_metadata as any)?.varkComplete === true

        const protectedStudentPaths = [
          "/student/dashboard",
          "/student/learn",
          "/student/chat",
        ]

        if (user.role === "student" && !varkComplete && pathname && protectedStudentPaths.includes(pathname)) {
          router.push("/student/vark-survey")
        }
      } catch (e) {
        router.push("/login")
      }
    })()
  }, [user, loading, router, requiredRoles, pathname])

  return { user, loading }
}
