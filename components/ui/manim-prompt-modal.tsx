"use client"

import React, { useState } from 'react'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from './dialog'
import { Button } from './button'
import { Textarea } from './textarea'
import { Input } from './input'
import { Spinner } from './spinner'

export default function ManimPromptModal() {
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [quality, setQuality] = useState('low')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<null | { jobId?: string; url?: string; message?: string; status?: string }>(null)
  const [polling, setPolling] = useState(false)

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!prompt.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/manim/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, quality }),
      })
      const data = await res.json()
      // Expecting a jobId when accepted
      setResult({ jobId: data.jobId, message: data.message, status: data.status })
      if (data.jobId) setPolling(true)
    } catch (err) {
      setResult({ message: 'Request failed' })
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (!polling || !result?.jobId) return
    let cancelled = false
    const jobId = result.jobId
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/manim/status/${jobId}`)
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        setResult((r) => ({ ...(r ?? {}), ...data }))
        if (data.status === 'completed' || data.status === 'failed') {
          setPolling(false)
        }
      } catch (e) {
        // ignore transient errors
      }
    }, 3000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [polling, result?.jobId])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">Generate Manim Video</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate explanatory video (Manim)</DialogTitle>
          <DialogDescription>
            Enter a short prompt describing the concept you want visualized. The
            system will generate a short Manim script and render a low-resolution
            video. This is a prototype — outputs are queued.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt((e.target as HTMLTextAreaElement).value)}
            placeholder="E.g. Explain the Pythagorean theorem with a right triangle animation"
            rows={6}
          />

          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="quality"
                value="low"
                checked={quality === 'low'}
                onChange={() => setQuality('low')}
              />
              <span>Low (fast)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="quality"
                value="high"
                checked={quality === 'high'}
                onChange={() => setQuality('high')}
              />
              <span>High (slower)</span>
            </label>
          </div>

          <DialogFooter>
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? <Spinner /> : 'Submit'}
              </Button>
              <DialogClose asChild>
                <Button variant="ghost">Close</Button>
              </DialogClose>
            </div>
          </DialogFooter>
        </form>

        {result && (
          <div className="mt-4">
            {result.url ? (
              <video controls src={result.url} className="w-full rounded-md" />
            ) : (
              <div className="rounded-md border p-3">
                <strong>Status:</strong> {result.message ?? 'Queued'}
                {result.jobId && (
                  <div className="text-sm text-muted-foreground">Job: {result.jobId}</div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
