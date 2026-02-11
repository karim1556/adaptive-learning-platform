"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Users, BookOpen, Settings, FileText, User, TrendingUp, FolderOpen } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { name: "Dashboard", href: "/admin/dashboard", icon: BarChart3 },
  { name: "Metrics", href: "/admin/metrics", icon: TrendingUp },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Teachers", href: "/admin/teachers", icon: BookOpen },
  { name: "Classes", href: "/admin/classes", icon: FolderOpen },
  { name: "Students", href: "/admin/students", icon: Users },
  { name: "Reports", href: "/admin/reports", icon: FileText },
  { name: "Content", href: "/admin/content", icon: BookOpen },
  { name: "My Profile", href: "/admin/profile", icon: User },
  { name: "Settings", href: "/admin/settings", icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-6">
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">AdaptIQ Admin</h2>
      </div>

      <nav className="space-y-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link key={item.href} href={item.href}>
              <button
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100"
                    : "text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700",
                )}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </button>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
