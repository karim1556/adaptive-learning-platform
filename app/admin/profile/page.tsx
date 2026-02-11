"use client"

import { useRequireAuth, useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User, ArrowLeft } from "lucide-react"

export default function AdminProfilePage() {
  const router = useRouter()
  const { user, loading } = useRequireAuth(["admin"])
  const { logout } = useAuth()
  if (loading) return null
  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => router.back()} className="hover:bg-slate-800 p-2 rounded-lg transition">
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <User className="w-6 h-6 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">Administrator Profile</h1>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Admin Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-400">First Name</p>
                <p className="text-lg font-semibold text-white">{user.firstName}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Last Name</p>
                <p className="text-lg font-semibold text-white">{user.lastName}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-slate-400">Email</p>
                <p className="text-lg font-semibold text-white">{user.email}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-slate-400">Role</p>
                <p className="text-lg font-semibold text-white">System Administrator</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Account Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full border-red-600/30 text-red-400 hover:bg-red-600/10 justify-start bg-transparent"
              onClick={() => {
                logout()
                router.push("/login")
              }}
            >
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
