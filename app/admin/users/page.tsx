"use client"

import { Suspense } from "react"
import { useRequireAuth } from "@/hooks/use-auth"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AdminHeader } from "@/components/admin/header"
import { AdminSidebar } from "@/components/admin/sidebar"
import SeedDemoData from "@/components/admin/seed-demo"
import { Search } from "lucide-react"
import { useState } from "react"

function AdminUsersContent() {
  const { user, loading } = useRequireAuth(["admin"])
  const [searchTerm, setSearchTerm] = useState("")

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  if (!user) return null

  const allUsers = [
    { id: 1, name: "Alex Johnson", email: "alex@student.com", role: "Student", status: "Active" },
    { id: 2, name: "Margaret Jones", email: "mrs.jones@teacher.com", role: "Teacher", status: "Active" },
    { id: 3, name: "Patricia Johnson", email: "parent1@home.com", role: "Parent", status: "Active" },
    { id: 4, name: "John Smith", email: "john@student.com", role: "Student", status: "Active" },
    { id: 5, name: "Robert Wilson", email: "robert@teacher.com", role: "Teacher", status: "Inactive" },
  ]

  const filteredUsers = allUsers.filter(
    (u) => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.includes(searchTerm),
  )

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Student":
        return "bg-blue-500/20 text-blue-400"
      case "Teacher":
        return "bg-green-500/20 text-green-400"
      case "Parent":
        return "bg-purple-500/20 text-purple-400"
      default:
        return "bg-slate-500/20 text-slate-400"
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">User Management</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage all platform users and permissions</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">Add User</Button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Role</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition">
                    <td className="px-6 py-4 text-sm text-white">{u.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{u.email}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleColor(u.role)}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          u.status === "Active" ? "bg-green-500/20 text-green-400" : "bg-slate-500/20 text-slate-400"
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export default function AdminUsersPage() {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader
          user={{ id: "1", email: "admin@school.com", firstName: "Admin", lastName: "User", role: "admin" }}
        />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-4">
              <SeedDemoData />
            </div>
            <Suspense
              fallback={
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              }
            >
              <AdminUsersContent />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}
