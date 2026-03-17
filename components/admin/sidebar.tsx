"use client"

import { usePathname } from "next/navigation"
import { BarChart3, Users, BookOpen, Settings, FileText, User, TrendingUp, FolderOpen, Shield } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import { RoleSidebarShell } from "@/components/navigation/role-sidebar-shell"

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
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    document.cookie = "adaptiq_role=; path=/; max-age=0"
    router.push("/login")
  }

  return (
    <RoleSidebarShell
      pathname={pathname}
      navItems={NAV_ITEMS.map((item) => ({ ...item, description: "Administrative controls" }))}
      homeHref="/admin/dashboard"
      brandTitle="AdaptIQ"
      brandSubtitle="Admin Console"
      brandIcon={Shield}
      accent="slate"
      onLogout={handleLogout}
    />
  )
}
