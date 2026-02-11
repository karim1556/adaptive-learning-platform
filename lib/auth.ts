export type UserRole = "student" | "teacher" | "parent" | "admin"

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  department?: string
  teacherProfileComplete?: boolean
}

export interface AuthSession {
  user: User
  token: string
  varkComplete?: boolean
  varkProfile?: any
}
// NOTE: Mock users and client-side session helpers were intentionally removed
// in favor of Supabase Auth. Keep only the shared types and routing helper.

// Get role-based dashboard route
export function getDashboardRoute(role: UserRole, varkComplete?: boolean): string {
  const routes: Record<UserRole, string> = {
    student: varkComplete ? "/student/dashboard" : "/student/vark-survey",
    teacher: "/teacher/dashboard",
    parent: "/parent/dashboard",
    admin: "/admin/dashboard",
  }
  return routes[role]
}

export default {}
