"use client"

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
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import { RoleSidebarShell } from "@/components/navigation/role-sidebar-shell"

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
    <RoleSidebarShell
      pathname={pathname}
      navItems={NAV_ITEMS}
      homeHref="/parent/dashboard"
      brandTitle="AdaptIQ"
      brandSubtitle="Parent Portal"
      brandIcon={GraduationCap}
      accent="emerald"
      onLogout={handleLogout}
    />
  )
}
