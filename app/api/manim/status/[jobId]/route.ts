import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const JOB_DIR = path.join(process.cwd(), 'manim_jobs')

export async function GET(req: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const { jobId } = params
    const jobPath = path.join(JOB_DIR, `${jobId}.json`)
    if (!fs.existsSync(jobPath)) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'))
    // If worker completed and wrote resultUrl, include it
    return NextResponse.json(job)
  } catch (err) {
    console.error('Manim status error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
