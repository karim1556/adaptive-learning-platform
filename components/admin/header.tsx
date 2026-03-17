"use client"

import type { User } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { LogOut, Shield } from "lucide-react"

interface AdminHeaderProps {
  user: User
}

export function AdminHeader({ user }: AdminHeaderProps) {
  const router = useRouter()

  const handleLogout = () => {
    ;(async () => {
      await supabase.auth.signOut()
      router.push("/login")
    })()
  }

  return (
    <header className="border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-800/95 sm:px-6">
      <div className="flex items-center justify-between gap-3" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Admin</p>
          <div className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
            <Shield className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <span className="truncate">Admin Dashboard</span>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2 bg-transparent rounded-xl">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
