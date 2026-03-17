"use client"

import { useState, useEffect } from "react"
import { Bell, Moon, Sun, Users } from "lucide-react"

interface ParentHeaderProps {
  user: {
    firstName?: string
    lastName?: string
  }
}

export function ParentHeader({ user }: ParentHeaderProps) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"))
  }, [])

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark")
    setIsDark(!isDark)
  }

  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "P"
  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Parent"

  return (
    <header className="border-b border-slate-200 bg-white/95 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:px-6">
      <div className="flex min-h-16 items-center justify-between gap-3" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="md:hidden">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">Parent</p>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
            <Users className="h-3.5 w-3.5 text-emerald-500" />
            AdaptIQ
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button className="relative p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition">
            <Bell className="w-5 h-5" />
          </button>

          <div className="hidden sm:block w-px h-8 bg-slate-200 dark:bg-slate-700" />

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right hidden md:block">
              <div className="text-sm font-medium text-slate-900 dark:text-white">{fullName}</div>
              <div className="text-xs text-slate-500">Parent</div>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white font-semibold text-sm">
              {initials}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
