"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabaseClient"
import { FileText, Award } from "lucide-react"

interface SoftSkillRecord {
  id: string
  skills: string[]
  source: string
  uploaded_at: string
}

interface Props {
  studentId: string
  studentName?: string
}

export function StudentSoftSkillsView({ studentId, studentName }: Props) {
  const [records, setRecords] = useState<SoftSkillRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [allSkills, setAllSkills] = useState<string[]>([])

  useEffect(() => {
    loadSoftSkills()
  }, [studentId, studentName])

  const loadSoftSkills = async () => {
    try {
      // Use API route to fetch soft skills (bypasses RLS)
      const response = await fetch('/api/teacher/student-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, studentName })
      })

      if (!response.ok) {
        console.error('API error loading soft skills:', response.status)
        return
      }

      const { softSkills } = await response.json()
      setRecords(softSkills || [])

      // Flatten all skills into unique list
      const uniqueSkills = new Set<string>()
      softSkills?.forEach((record: any) => {
        record.skills?.forEach((skill: string) => uniqueSkills.add(skill))
      })
      setAllSkills(Array.from(uniqueSkills))
    } catch (err) {
      console.error('Failed to load soft skills:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Soft Skills
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  if (records.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Soft Skills
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">No soft skills uploaded yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5" />
          Soft Skills ({allSkills.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* All Detected Skills Summary */}
        <div>
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Detected Skills
          </h4>
          <div className="flex flex-wrap gap-2">
            {allSkills.map((skill, idx) => (
              <Badge key={idx} variant="secondary" className="capitalize">
                {skill}
              </Badge>
            ))}
          </div>
        </div>

        {/* Individual Submissions */}
        <div>
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Submissions ({records.length})
          </h4>
          <div className="space-y-2">
            {records.map((record) => (
              <div
                key={record.id}
                className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-500">
                      {new Date(record.uploaded_at).toLocaleDateString()}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {record.source || 'upload'}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {record.skills?.map((skill, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded capitalize"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
