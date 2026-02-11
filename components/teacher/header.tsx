"use client"

import { Bell, Search, Moon, Sun } from "lucide-react"
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
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search students, classes..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-700 transition"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <button className="relative p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />

        {/* User */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-slate-900 dark:text-white">{fullName}</div>
            <div className="text-xs text-slate-500">{user.department || "Teacher"}</div>
          </div>
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-semibold text-sm">
            {initials}
          </div>
        </div>
      </div>
    </header>
  )
}
