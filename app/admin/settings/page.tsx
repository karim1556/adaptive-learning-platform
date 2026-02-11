"use client"

import { useRequireAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings, Users, Lock } from "lucide-react"

export default function AdminSettingsPage() {
  const router = useRouter()
  const { user, loading } = useRequireAuth(["admin"])
  if (loading) return null
  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">Admin Settings</h1>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="w-5 h-5 text-blue-400" />
              User Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full bg-blue-600 hover:bg-blue-700">Add User</Button>
            <Button variant="outline" className="w-full border-slate-600 text-white hover:bg-slate-700 bg-transparent">
              Manage Users
            </Button>
            <Button variant="outline" className="w-full border-slate-600 text-white hover:bg-slate-700 bg-transparent">
              View Audit Log
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Lock className="w-5 h-5 text-blue-400" />
              System Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full border-slate-600 text-white hover:bg-slate-700 bg-transparent">
              Manage API Keys
            </Button>
            <Button variant="outline" className="w-full border-slate-600 text-white hover:bg-slate-700 bg-transparent">
              Security Settings
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Platform Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full border-slate-600 text-white hover:bg-slate-700 bg-transparent">
              System Configuration
            </Button>
            <Button variant="outline" className="w-full border-slate-600 text-white hover:bg-slate-700 bg-transparent">
              Backup & Recovery
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
