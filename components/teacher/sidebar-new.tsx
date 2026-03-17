"use client"

import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Users, 
  BookOpen,
  FolderOpen,
  PlusCircle,
  Settings,
  LogOut,
  ChevronRight,
  GraduationCap,
  BarChart3,
  BookMarked
} from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import { RoleSidebarShell } from "@/components/navigation/role-sidebar-shell"

const NAV_ITEMS = [
  { 
    name: "Dashboard", 
    href: "/teacher/dashboard", 
    icon: LayoutDashboard,
    description: "Overview & insights"
  },
  { 
    name: "Lesson Builder", 
    href: "/teacher/lessons", 
    icon: BookOpen,
    description: "Create lessons"
  },
  { 
    name: "My Classes", 
    href: "/teacher/classes", 
    icon: Users,
    description: "Manage students"
  },
  { 
    name: "Diary", 
    href: "/teacher/diary", 
    icon: BookMarked,
    description: "Attendance & notes"
  },
  { 
    name: "Projects", 
    href: "/teacher/projects", 
    icon: FolderOpen,
    description: "PBL assignments"
  },
  { 
    name: "Live Polls", 
    href: "/teacher/polls", 
    icon: BarChart3,
    description: "Real-time feedback"
  },
  { 
    name: "Settings", 
    href: "/teacher/settings", 
    icon: Settings,
    description: "Preferences"
  },
]

export function TeacherSidebar() {
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
      homeHref="/teacher/dashboard"
      brandTitle="AdaptIQ"
      brandSubtitle="Teacher Portal"
      brandIcon={GraduationCap}
      action={{ href: "/teacher/classes?create=true", label: "Create Class", icon: PlusCircle }}
      accent="indigo"
      onLogout={handleLogout}
    />
  )
}
