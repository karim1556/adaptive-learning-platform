import { NextResponse } from "next/server"

const WORD_API = "https://api.frontendexpert.io/api/fe/wordle-words"

export async function GET() {
  try {
    const res = await fetch(WORD_API)
    if (!res.ok) {
      return NextResponse.json({ error: "upstream error" }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: "fetch failed" }, { status: 502 })
  }
}
