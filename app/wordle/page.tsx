import React from "react"
import Wordle from "../../components/wordle"

export default function Page() {
  return (
    <main style={{ display: "flex", justifyContent: "center", padding: 24 }}>
      <Wordle />
    </main>
  )
}
