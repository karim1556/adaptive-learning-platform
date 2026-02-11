"use client"

import type { User } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { LogOut } from "lucide-react"

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
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Admin Dashboard</h1>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2 bg-transparent">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}
