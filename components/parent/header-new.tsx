"use client"

import { useState, useEffect } from "react"
import { Bell, Moon, Sun } from "lucide-react"

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
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between">
      <div className="flex-1" />
      
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <button className="relative p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition">
          <Bell className="w-5 h-5" />
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />

        {/* User */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-slate-900 dark:text-white">{fullName}</div>
            <div className="text-xs text-slate-500">Parent</div>
          </div>
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white font-semibold text-sm">
            {initials}
          </div>
        </div>
      </div>
    </header>
  )
}
