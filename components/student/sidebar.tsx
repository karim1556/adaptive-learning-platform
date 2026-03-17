"use client"

import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  BookOpen, 
  MessageSquare, 
  Trophy, 
  User, 
  LogOut,
  ChevronRight,
  GraduationCap,
  Plus,
  FolderOpen
} from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import { RoleSidebarShell } from "@/components/navigation/role-sidebar-shell"

const NAV_ITEMS = [
  { 
    name: "Dashboard", 
    href: "/student/dashboard", 
    icon: LayoutDashboard,
    description: "Overview & progress"
  },
  { 
    name: "Lessons", 
    href: "/student/lessons", 
    icon: BookOpen,
    description: "Interactive lessons"
  },
  { 
    name: "Projects", 
    href: "/student/projects", 
    icon: FolderOpen,
    description: "Team projects"
  },
  { 
    name: "AI Tutor", 
    href: "/student/chat", 
    icon: MessageSquare,
    description: "Get help anytime"
  },
  { 
    name: "Mastery", 
    href: "/student/grades", 
    icon: Trophy,
    description: "Track your skills"
  },
  { 
    name: "Profile", 
    href: "/student/profile", 
    icon: User,
    description: "Settings & VARK"
  },
]

export function StudentSidebar() {
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
      homeHref="/student/dashboard"
      brandTitle="AdaptIQ"
      brandSubtitle="Student Portal"
      brandIcon={GraduationCap}
      action={{ href: "/student/join-class", label: "Join a Class", icon: Plus }}
      accent="blue"
      onLogout={handleLogout}
    />
  )
}
