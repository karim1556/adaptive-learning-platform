// VARK Survey data and scoring logic
export interface VARKAnswers {
  [key: string]: string
}

export interface VARKScores {
  visual: number
  auditory: number
  reading: number
  kinesthetic: number
}

export interface VARKResult {
  // Backwards-compatible capitalized labels
  dominantStyle: string
  secondaryStyle: string
  // Full normalized distribution (percentages summing to 100)
  scores: VARKScores
  // Ordered array of top-2 styles (lowercase keys) for programmatic use
  dominantStyles: [string, string]
  description: string
}

// VARK Survey questions - 16 questions, 4 answers each
export const VARK_QUESTIONS = [
  {
    id: "q1",
    question: "You are helping someone who wants to go to your airport, town center or railway station. You would:",
    answers: [
      { id: "a", text: "draw, or trace a map on paper", style: "visual" },
      { id: "b", text: "tell them the directions", style: "auditory" },
      { id: "c", text: "write down the directions (without a map)", style: "reading" },
      { id: "d", text: "go with them and show the way", style: "kinesthetic" },
    ],
  },
  {
    id: "q2",
    question: "A group of tourists has been assigned to you. You would:",
    answers: [
      { id: "a", text: "show them the sights, beaches and parks", style: "kinesthetic" },
      { id: "b", text: "tell them about the interesting history and stories", style: "auditory" },
      { id: "c", text: "give them a map and suggested tour sites", style: "visual" },
      { id: "d", text: "describe routes and print out information", style: "reading" },
    ],
  },
  {
    id: "q3",
    question: "You are planning a holiday for a group. You would:",
    answers: [
      { id: "a", text: "use a map and check the roads and travel times", style: "visual" },
      { id: "b", text: "phone up and talk to a travel agent", style: "auditory" },
      { id: "c", text: "gather written details about destinations", style: "reading" },
      { id: "d", text: "visit the places yourself", style: "kinesthetic" },
    ],
  },
  {
    id: "q4",
    question: "You want to learn about a new software on your computer. You would:",
    answers: [
      { id: "a", text: "go through the diagrams in the book that came with it", style: "visual" },
      { id: "b", text: "talk to the help desk and ask questions", style: "auditory" },
      { id: "c", text: "read the written instructions", style: "reading" },
      { id: "d", text: "start using the software and learn by trial and error", style: "kinesthetic" },
    ],
  },
  {
    id: "q5",
    question: "I learn best when the teacher:",
    answers: [
      { id: "a", text: "uses demonstrations, models or videos", style: "visual" },
      { id: "b", text: "gives me lectures and time for discussion", style: "auditory" },
      { id: "c", text: "gives me printed information and references", style: "reading" },
      { id: "d", text: "allows me to practice and experiment", style: "kinesthetic" },
    ],
  },
  {
    id: "q6",
    question: "I prefer to learn new information by:",
    answers: [
      { id: "a", text: "watching and observing", style: "visual" },
      { id: "b", text: "listening and discussing", style: "auditory" },
      { id: "c", text: "reading and writing", style: "reading" },
      { id: "d", text: "doing and practicing", style: "kinesthetic" },
    ],
  },
  {
    id: "q7",
    question: "When I am at a party, I:",
    answers: [
      { id: "a", text: "notice people's appearance and surroundings", style: "visual" },
      { id: "b", text: "listen to and talk with others", style: "auditory" },
      { id: "c", text: "enjoy reading the hosts' books and checking out the music CDs", style: "reading" },
      { id: "d", text: "move around and help the host", style: "kinesthetic" },
    ],
  },
  {
    id: "q8",
    question: "I understand something best when I have:",
    answers: [
      { id: "a", text: "a diagram or picture", style: "visual" },
      { id: "b", text: "heard it explained", style: "auditory" },
      { id: "c", text: "read about it", style: "reading" },
      { id: "d", text: "tried it out", style: "kinesthetic" },
    ],
  },
  {
    id: "q9",
    question: "At a work place or college, I learn to operate a new machine by:",
    answers: [
      { id: "a", text: "watching what the instructor does", style: "visual" },
      { id: "b", text: "listening to an explanation of how it operates", style: "auditory" },
      { id: "c", text: "reading the operating manual", style: "reading" },
      { id: "d", text: "practicing with the machine", style: "kinesthetic" },
    ],
  },
  {
    id: "q10",
    question: "I prefer to receive new information as:",
    answers: [
      { id: "a", text: "a picture, drawing or diagram", style: "visual" },
      { id: "b", text: "a verbal explanation", style: "auditory" },
      { id: "c", text: "a written description", style: "reading" },
      { id: "d", text: "a practical experience", style: "kinesthetic" },
    ],
  },
  {
    id: "q11",
    question: "I read:",
    answers: [
      { id: "a", text: "comics, magazines with pictures and action", style: "visual" },
      { id: "b", text: "novels, stories with dialogue and conversation", style: "auditory" },
      { id: "c", text: "factual articles and detailed information", style: "reading" },
      { id: "d", text: "things where I can participate or do activities", style: "kinesthetic" },
    ],
  },
  {
    id: "q12",
    question: "To remember something new, I like to:",
    answers: [
      { id: "a", text: "create a mental picture", style: "visual" },
      { id: "b", text: "say it aloud or discuss it", style: "auditory" },
      { id: "c", text: "write it down several times", style: "reading" },
      { id: "d", text: "do it or act it out", style: "kinesthetic" },
    ],
  },
  {
    id: "q13",
    question: "I concentrate best when there is:",
    answers: [
      { id: "a", text: "no sound", style: "visual" },
      { id: "b", text: "talking and listening", style: "auditory" },
      { id: "c", text: "reading material available", style: "reading" },
      { id: "d", text: "the chance to move about", style: "kinesthetic" },
    ],
  },
  {
    id: "q14",
    question: "I enjoy:",
    answers: [
      { id: "a", text: "visual presentations like slideshows and films", style: "visual" },
      { id: "b", text: "listening to music and podcasts", style: "auditory" },
      { id: "c", text: "reading books and articles", style: "reading" },
      { id: "d", text: "physical activities and sports", style: "kinesthetic" },
    ],
  },
  {
    id: "q15",
    question: "In my spare time, I like to:",
    answers: [
      { id: "a", text: "watch videos or look at pictures", style: "visual" },
      { id: "b", text: "listen to music or podcasts", style: "auditory" },
      { id: "c", text: "read books or articles", style: "reading" },
      { id: "d", text: "exercise or play sports", style: "kinesthetic" },
    ],
  },
  {
    id: "q16",
    question: "When meeting someone new, I am most likely to:",
    answers: [
      { id: "a", text: "notice their appearance and expressions", style: "visual" },
      { id: "b", text: "listen to their voice and what they say", style: "auditory" },
      { id: "c", text: "look at how they are dressed and their mannerisms", style: "reading" },
      { id: "d", text: "shake their hand or move closer to them", style: "kinesthetic" },
    ],
  },
]

export function scoreVARKAnswers(answers: VARKAnswers): VARKResult {
  const scores: VARKScores = {
    visual: 0,
    auditory: 0,
    reading: 0,
    kinesthetic: 0,
  }

  // Count scores based on answers
  VARK_QUESTIONS.forEach((question) => {
    const answerId = answers[question.id]
    const selectedAnswer = question.answers.find((a) => a.id === answerId)
    if (selectedAnswer) {
      scores[selectedAnswer.style as keyof VARKScores]++
    }
  })

  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a)
  const dominantScore = sorted[0][1]
  const secondaryScore = sorted[1][1]

  // If top two styles are close (within 1 point), both are dominant
  // Otherwise, only the top is dominant
  const hasDualStyle = dominantScore - secondaryScore <= 1

  const dominantStyle = sorted[0][0]
  const secondaryStyle = sorted[1][0]

  // If only one dominant style, pick the second strongest as secondary
  if (!hasDualStyle) {
    // Keep secondary as is
  }

  const descriptions: Record<string, string> = {
    visual:
      "You learn best through visual information like diagrams, maps, charts, and images. You enjoy seeing concepts presented visually and benefit from color-coding and visual representations.",
    auditory:
      "You learn best through listening and discussion. You prefer verbal explanations, enjoy conversations, and benefit from hearing concepts explained out loud.",
    reading:
      "You learn best through reading and writing. You prefer detailed text-based information, written explanations, and structured note-taking.",
    kinesthetic:
      "You learn best through doing and hands-on practice. You understand concepts better by experiencing them physically and learning by trying things out.",
  }
  // Normalize counts into percentage distribution that sums to 100.
  // We use integer percentages and distribute any rounding remainder by
  // allocating +1 to styles with largest fractional parts. This ensures the
  // UI and downstream logic receive a clear 0-100 distribution.
  const total = Object.values(scores).reduce((s, v) => s + v, 0)

  let percentScores: VARKScores
  if (total <= 0) {
    // Fallback to uniform distribution if no answers were recorded
    percentScores = { visual: 25, auditory: 25, reading: 25, kinesthetic: 25 }
  } else {
    const raw: Array<[keyof VARKScores, number]> = Object.entries(scores) as Array<[
      keyof VARKScores,
      number
    ]>

    const rawPcts = raw.map(([k, v]) => {
      const pct = (v / total) * 100
      return { k, v, pct, floor: Math.floor(pct), frac: pct - Math.floor(pct) }
    })

    let floorSum = rawPcts.reduce((s, r) => s + r.floor, 0)
    let remaining = 100 - floorSum

    // Sort by fractional part descending to allocate remaining +1s fairly
    rawPcts.sort((a, b) => b.frac - a.frac)

    const allocated: Record<string, number> = {}
    for (const r of rawPcts) {
      allocated[r.k] = r.floor
    }
    let i = 0
    while (remaining > 0) {
      allocated[rawPcts[i % rawPcts.length].k]++
      remaining--
      i++
    }

    percentScores = {
      visual: allocated["visual"] || 0,
      auditory: allocated["auditory"] || 0,
      reading: allocated["reading"] || 0,
      kinesthetic: allocated["kinesthetic"] || 0,
    }
  }

  // Determine top-2 dominant styles from the percentage distribution.
  // We expose both a programmatic `dominantStyles` array (lowercase keys)
  // and backward-compatible capitalized `dominantStyle` / `secondaryStyle`.
  const sortedByPct = Object.entries(percentScores).sort(([, a], [, b]) => b - a)
  const primary = sortedByPct[0][0]
  const secondary = sortedByPct[1][0]

  // Why top-2 only: using the two strongest preferences keeps personalization
  // focused and avoids overfitting to noisy small differences. It provides
  // enough breadth to diversify content while remaining actionable for
  // recommendation and tutoring heuristics.

  return {
    dominantStyle: primary.charAt(0).toUpperCase() + primary.slice(1),
    secondaryStyle: secondary.charAt(0).toUpperCase() + secondary.slice(1),
    scores: percentScores,
    dominantStyles: [primary, secondary] as [string, string],
    description: descriptions[primary] || "",
  }
}

export function getDominantLearningStyles(varkProfile: VARKScores): [string, string] {
  const sorted = Object.entries(varkProfile).sort(([, a], [, b]) => b - a)
  const first = sorted[0]?.[0] ?? "visual"
  const second = sorted[1]?.[0] ?? "auditory"
  return [first, second]
}

export function getStyleColor(style: string): string {
  const colors: Record<string, string> = {
    visual: "bg-blue-500",
    auditory: "bg-purple-500",
    reading: "bg-green-500",
    kinesthetic: "bg-orange-500",
  }
  return colors[style.toLowerCase()] || "bg-gray-500"
}

export function getStyleEmoji(style: string): string {
  const emojis: Record<string, string> = {
    visual: "👁️",
    auditory: "👂",
    reading: "📖",
    kinesthetic: "🤚",
  }
  return emojis[style.toLowerCase()] || "📚"
}
