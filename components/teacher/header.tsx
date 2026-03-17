"use client"

import { Bell, BookMarked, Moon, Search, Sun } from "lucide-react"
import { useState, useEffect } from "react"
import type { User } from "@/lib/auth"

interface TeacherHeaderProps {
  user: User
}

export function TeacherHeader({ user }: TeacherHeaderProps) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const dark = document.documentElement.classList.contains("dark")
    setIsDark(dark)
  }, [])

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark")
    setIsDark(!isDark)
  }

  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "T"
  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Teacher"

  return (
    <header className="border-b border-slate-200 bg-white/95 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:px-6">
      <div className="flex min-h-16 items-center justify-between gap-3" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="flex min-w-0 items-center gap-3">
          <div className="md:hidden">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">Teacher</p>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
              <BookMarked className="h-3.5 w-3.5 text-indigo-500" />
              AdaptIQ
            </div>
          </div>

          <div className="hidden md:block w-full max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search students, classes..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 border-0 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-700 transition"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button className="md:hidden p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition">
            <Search className="w-5 h-5" />
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button className="relative p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          <div className="hidden sm:block w-px h-8 bg-slate-200 dark:bg-slate-700" />

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right hidden md:block">
              <div className="text-sm font-medium text-slate-900 dark:text-white">{fullName}</div>
              <div className="text-xs text-slate-500">{user.department || "Teacher"}</div>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-semibold text-sm">
              {initials}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
