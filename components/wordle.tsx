"use client"

import React, { useEffect, useState } from "react"

const WORD_API = "/api/wordle"
const ROWS = 6
const COLS = 5

const keyboardLayout = [
  ["q","w","e","r","t","y","u","i","o","p"],
  ["a","s","d","f","g","h","j","k","l"],
  ["enter","z","x","c","v","b","n","m","backspace"]
]

export default function Wordle(): JSX.Element {
  const [guesses, setGuesses] = useState<string[][]>(
    Array.from({ length: ROWS }, () => Array(COLS).fill("") )
  )
  const [tileColors, setTileColors] = useState<string[][]>(
    Array.from({ length: ROWS }, () => Array(COLS).fill("") )
  )
  const [currentRow, setCurrentRow] = useState(0)
  const [currentCol, setCurrentCol] = useState(0)
  const [isGameOver, setIsGameOver] = useState(false)
  const [targetWord, setTargetWord] = useState("")
  const [keyColors, setKeyColors] = useState<Record<string,string>>({})

  useEffect(() => {
    async function loadWords() {
      try {
        const res = await fetch(WORD_API)
        if (!res.ok) throw new Error(`status=${res.status}`)
        const words: string[] = await res.json()
        const w = words[Math.floor(Math.random() * words.length)]
        setTargetWord(w)
        console.log("%c[WORDLE DEBUG] Correct word:", "color: #4caf50; font-weight: bold;", w.toUpperCase())
      } catch (e) {
        console.error("Failed to load words from API, using fallback", e)
        const fallback = ["apple","react","plane","crate","flute","ghost","store","shine"]
        const w = fallback[Math.floor(Math.random() * fallback.length)]
        setTargetWord(w)
      }
    }
    loadWords()
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isGameOver) return
      if (e.key === "Backspace") handleKey("backspace")
      else if (e.key === "Enter") handleKey("enter")
      else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toLowerCase())
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isGameOver, currentRow, currentCol, guesses, targetWord])

  function handleKey(key: string) {
    if (isGameOver) return

    if (key === "backspace") {
      if (currentCol > 0) {
        const g = guesses.map(row => row.slice())
        g[currentRow][currentCol - 1] = ""
        setGuesses(g)
        setCurrentCol(currentCol - 1)
      }
      return
    }

    if (key === "enter") {
      if (currentCol === COLS) submitGuess()
      return
    }

    if (currentCol < COLS) {
      const g = guesses.map(row => row.slice())
      g[currentRow][currentCol] = key
      setGuesses(g)
      setCurrentCol(currentCol + 1)
    }
  }

  function colorPriority(a: string | undefined) {
    if (a === "green") return 3
    if (a === "yellow") return 2
    if (a === "gray") return 1
    return 0
  }

  function updateKeyColor(letter: string, color: string) {
    setKeyColors(prev => {
      const prevColor = prev[letter]
      if (colorPriority(prevColor) >= colorPriority(color)) return prev
      return { ...prev, [letter]: color }
    })
  }

  function submitGuess() {
    const guess = guesses[currentRow].join("")
    if (guess.length !== COLS) return

    const guessLower = guess.toLowerCase()
    const targetLower = (targetWord || "").toLowerCase().trim()

    const targetArr = targetLower.split("")
    const guessArr = guessLower.split("")

    console.log("[WORDLE DEBUG] submitGuess", { guess: guessLower, target: targetLower })
    const newRowColors = Array(COLS).fill("")

    // PASS 1 - greens
    for (let i = 0; i < COLS; i++) {
      if (guessArr[i] === targetArr[i]) {
        newRowColors[i] = "green"
        if (guessArr[i] != null) updateKeyColor(guessArr[i], "green")
        targetArr[i] = null as any
        guessArr[i] = null as any
      }
    }

    // PASS 2 - yellow or gray
    for (let i = 0; i < COLS; i++) {
      if (guessArr[i] === null) continue
      const idx = targetArr.indexOf(guessArr[i])
      if (idx !== -1) {
        newRowColors[i] = "yellow"
        if (guessArr[i] != null) updateKeyColor(guessArr[i]!, "yellow")
        targetArr[idx] = null as any
      } else {
        newRowColors[i] = "gray"
        if (guessArr[i] != null) updateKeyColor(guessArr[i]!, "gray")
      }
    }

    console.log("[WORDLE DEBUG] newRowColors", newRowColors)

    // set tile colors for the row
    setTileColors(prev => {
      const copy = prev.map(row => row.slice())
      copy[currentRow] = newRowColors
      return copy
    })

    if (guess === targetWord) {
      setIsGameOver(true)
      setTimeout(() => alert("🎉 You Win!"), 300)
      return
    }

    const nextRow = currentRow + 1
    setCurrentRow(nextRow)
    setCurrentCol(0)

    if (nextRow === ROWS) {
      setIsGameOver(true)
      setTimeout(() => alert(`❌ Word was: ${targetWord.toUpperCase()}`), 300)
    }
  }

  return (
    <div>
      <h1>WORDLE</h1>

      <div className="grid" id="grid">
        {guesses.map((row, r) => (
          <div key={r} className="row">
            {row.map((ch, c) => (
              <div
                key={c}
                className={`tile`}
                style={(() => {
                  const col = tileColors[r][c]
                  if (col === "green") return { backgroundColor: "#538d4e", borderColor: "#538d4e" }
                  if (col === "yellow") return { backgroundColor: "#b59f3b", borderColor: "#b59f3b" }
                  if (col === "gray") return { backgroundColor: "#3a3a3c", borderColor: "#3a3a3c" }
                  return {}
                })()}
              >
                {ch}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="keyboard">
        {keyboardLayout.map((row, ri) => (
          <div key={ri} className="key-row">
            {row.map(k => {
              const label = k === "enter" ? "ENTER" : k === "backspace" ? "⌫" : k
              const classes = ["key", keyColors[k] || ""]
              if (k === "enter" || k === "backspace") classes.push("large")
              return (
                <div
                  key={k}
                  data-key={k}
                  className={classes.join(" ")}
                  onClick={() => handleKey(k)}
                  style={(() => {
                    const col = keyColors[k]
                    if (col === "green") return { backgroundColor: "#538d4e" }
                    if (col === "yellow") return { backgroundColor: "#b59f3b" }
                    if (col === "gray") return { backgroundColor: "#3a3a3c" }
                    return {}
                  })()}
                >
                  {label}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <style jsx>{`
        :global(body) { margin: 0; background: #121213; color: #fff; font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif; display: flex; flex-direction: column; align-items: center; padding-top: 20px; }
        h1 { margin-bottom: 20px; letter-spacing: 4px }
        .grid { display: grid; grid-template-rows: repeat(6, 1fr); gap: 10px; margin-bottom: 30px }
        .row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px }
        .tile { width: 60px; height: 60px; border: 2px solid #3a3a3c; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: bold; text-transform: uppercase; box-sizing: border-box; transition: background-color 0.3s ease, border-color 0.3s ease }
        .tile.green { background-color: #538d4e; border-color: #538d4e }
        .tile.yellow { background-color: #b59f3b; border-color: #b59f3b }
        .tile.gray { background-color: #3a3a3c; border-color: #3a3a3c }
        .keyboard { display: flex; flex-direction: column; gap: 8px }
        .key-row { display: flex; justify-content: center; gap: 6px }
        .key { background: #818384; padding: 12px 14px; border-radius: 4px; font-weight: bold; cursor: pointer; user-select: none; text-transform: uppercase; transition: background-color 0.2s ease }
        .key.large { padding: 12px 20px }
        .key.green { background-color: #538d4e }
        .key.yellow { background-color: #b59f3b }
        .key.gray { background-color: #3a3a3c }
      `}</style>
    </div>
  )
}
