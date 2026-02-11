"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare,
  Settings,
  LogOut,
  ChevronRight,
  GraduationCap
} from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

const NAV_ITEMS = [
  { 
    name: "Dashboard", 
    href: "/parent/dashboard", 
    icon: LayoutDashboard,
    description: "Children overview"
  },
  { 
    name: "My Children", 
    href: "/parent/children", 
    icon: Users,
    description: "Detailed progress"
  },
  { 
    name: "Messages", 
    href: "/parent/messages", 
    icon: MessageSquare,
    description: "Teacher updates"
  },
  { 
    name: "Settings", 
    href: "/parent/settings", 
    icon: Settings,
    description: "Preferences"
  },
]

export function ParentSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    document.cookie = "adaptiq_role=; path=/; max-age=0"
    router.push("/login")
  }

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800">
        <Link href="/parent/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">AdaptIQ</span>
            <span className="block text-xs text-slate-500">Parent Portal</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                  isActive
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300")} />
                <div className="flex-1 min-w-0">
                  <div className={cn("text-sm font-medium", isActive ? "text-white" : "text-slate-900 dark:text-white")}>
                    {item.name}
                  </div>
                  <div className={cn("text-xs truncate", isActive ? "text-emerald-100" : "text-slate-500")}>
                    {item.description}
                  </div>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-emerald-200" />}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
