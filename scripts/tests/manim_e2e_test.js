let fetchFn = globalThis.fetch
if (!fetchFn) {
  try {
    fetchFn = require('node-fetch')
  } catch (e) {
    throw new Error('No global fetch available. Install node-fetch or use Node 18+')
  }
}

const API_BASE = process.env.API_BASE || 'http://localhost:3000'

async function createJob(prompt) {
  const res = await fetchFn(`${API_BASE}/api/manim/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, quality: 'low' }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Create job failed: ${JSON.stringify(data)}`)
  return data.jobId
}

async function getStatus(jobId) {
  const res = await fetchFn(`${API_BASE}/api/manim/status/${jobId}`)
  if (res.status === 404) return null
  return res.json()
}

async function main() {
  const prompt = process.argv[2] || 'Show a square and a title about similarity'
  console.log('Creating job for prompt:', prompt)
  const jobId = await createJob(prompt)
  console.log('Job created:', jobId)

  while (true) {
    const status = await getStatus(jobId)
    if (!status) {
      console.log('Job not found yet, retrying...')
      await new Promise(r => setTimeout(r, 2000))
      continue
    }
    console.log('Status:', status.status)
    if (status.status === 'completed') {
      console.log('Completed! resultUrl:', status.resultUrl)
      break
    }
    if (status.status === 'failed') {
      console.error('Job failed:', status.error || status)
      break
    }
    await new Promise(r => setTimeout(r, 3000))
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
