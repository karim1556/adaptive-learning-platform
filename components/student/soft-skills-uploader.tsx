"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Upload, CheckCircle } from "lucide-react"

interface Props {
  studentId: string
}

interface SubmissionRecord {
  id: string
  skills: string[]
  source: string
  uploaded_at: string
}

export default function SoftSkillsUploader({ studentId }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [description, setDescription] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [skills, setSkills] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    loadHistory()
  }, [studentId])

  const loadHistory = async () => {
    setLoadingHistory(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('student_soft_skills')
        .select('*')
        .eq('student_id', studentId)
        .order('uploaded_at', { ascending: false })
        .limit(5)

      if (!fetchError && data) {
        setSubmissions(data)
      }
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleFile = (f: File | null) => {
    setFile(f)
    setSkills(null)
    setError(null)
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file && !description.trim()) {
      setError('Please attach a file or provide a short description.')
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      const form = new FormData()
      if (file) form.append('file', file)
      form.append('description', description)
      form.append('studentId', studentId)

      const res = await fetch('/api/ai/analyze-soft-skills', {
        method: 'POST',
        body: form,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')

      setSkills(data.skills || [])

      // Save to student record (teacher view) - best-effort, non-blocking
      await fetch('/api/student/soft-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, skills: data.skills || [], source: data.source || 'upload' }),
      })

      // Reload history
      setTimeout(() => loadHistory(), 500)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Unexpected error')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Upload className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-slate-900 dark:text-white">Upload Achievements</h3>
        </div>
        <p className="text-sm text-slate-500">Share certificates, project evidence, hackathon entries or a short description. Our AI will extract likely soft skills you developed.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">File (optional)</label>
          <input
            type="file"
            onChange={(e) => handleFile(e.target.files ? e.target.files[0] : null)}
            className="w-full text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Short description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
            rows={3}
            placeholder="E.g. Participated in XYZ hackathon, built a team project on ABC..."
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isAnalyzing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze & Submit'}
          </button>
          <button 
            type="button" 
            onClick={() => { setFile(null); setDescription(''); setSkills(null); setError(null) }} 
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Clear
          </button>
        </div>
      </form>

      {skills && skills.length > 0 && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h4 className="text-sm font-semibold text-green-900 dark:text-green-100">Detected Soft Skills</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {skills.map((s, i) => (
              <span key={i} className="inline-block bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm capitalize">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {skills && skills.length === 0 && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="text-sm text-yellow-800 dark:text-yellow-200">No soft skills were detected from your input. Try adding a more detailed description of what you did (team size, role, responsibilities, outcomes).</div>
        </div>
      )}

      {/* Recent Submissions */}
      {submissions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Recent Submissions</h4>
          <div className="space-y-2">
            {submissions.map((sub) => (
              <div key={sub.id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="text-xs text-slate-500 mb-1">
                  {new Date(sub.uploaded_at).toLocaleDateString()} • {sub.source}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sub.skills?.map((skill, idx) => (
                    <span key={idx} className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded capitalize">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

