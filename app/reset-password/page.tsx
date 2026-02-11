"use client"

import React, { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const [tokenPresent, setTokenPresent] = useState(false)

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    // Supabase may redirect with tokens either in the query string or in the URL fragment (#)
    // Check both locations so the reset link works regardless of how Supabase returns tokens.
    const getFromQuery = () => {
      const at = searchParams.get("access_token") || searchParams.get("token")
      const rt = searchParams.get("refresh_token")
      if (at) return { at, rt }
      return null
    }

    const getFromHash = () => {
      if (typeof window === "undefined") return null
      const hash = window.location.hash || ""
      if (!hash) return null
      // hash looks like: #access_token=...&refresh_token=...&...  (no leading ?)
      const params = new URLSearchParams(hash.replace(/^#/, ""))
      const at = params.get("access_token") || params.get("token")
      const rt = params.get("refresh_token")
      if (at) return { at, rt }
      return null
    }

    const fromQuery = getFromQuery()
    if (fromQuery) {
      setAccessToken(fromQuery.at)
      if (fromQuery.rt) setRefreshToken(fromQuery.rt)
      setTokenPresent(true)
      return
    }

    const fromHash = getFromHash()
    if (fromHash) {
      setAccessToken(fromHash.at)
      if (fromHash.rt) setRefreshToken(fromHash.rt)
      setTokenPresent(true)
    }
  }, [searchParams])

  useEffect(() => {
    // If we have an access token in the URL, set the session so updateUser works.
    ;(async () => {
      if (!accessToken) return
      try {
        // Try to set session using the provided tokens
        const sessionData: { access_token: string; refresh_token?: string } = { access_token: accessToken }
        if (refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        } else {
          await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: ""
          })
        }
      } catch (e) {
        // ignore; user can still attempt update which may fail if session isn't valid
        console.warn("Failed to set session from reset token", e)
      }
    })()
  }, [accessToken, refreshToken])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    if (!password) return setError("Enter a new password.")
    if (password.length < 6) return setError("Password must be at least 6 characters.")
    if (password !== confirm) return setError("Passwords do not match.")

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess("Password updated. Redirecting to sign in...")
      setTimeout(() => router.push("/login"), 1200)
    } catch (err: any) {
      setError(err?.message || "Could not update password. Try requesting a new reset link.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>{tokenPresent ? "Choose a new password" : "Reset Password"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!tokenPresent && (
                <p className="text-sm text-slate-600">We couldn't find a valid reset token in the URL. Use the link from the email or request a new reset.</p>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>

              {error && (
                <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">{success}</div>
              )}

              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={loading || !tokenPresent}>
                  {loading ? "Updating..." : "Set new password"}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.push("/login")}>Back</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">Please wait...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
