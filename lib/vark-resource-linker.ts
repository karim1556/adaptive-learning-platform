import resourceLibrary from "@/data/vark-resource-links.json"

export interface ResourceRecommendationInput {
  topic: string
  dominantStyle?: string
  secondaryStyle?: string
  masteryLevel?: number
}

export interface StaticResourceLink {
  id: string
  title: string
  url: string
  provider: string
  description: string
  difficulty: "beginner" | "intermediate" | "advanced"
  duration?: string
  styles: string[]
  tags: string[]
}

export const varkResourceLibrary = resourceLibrary as StaticResourceLink[]

function tokenizeTopic(topic: string) {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
}

export function rankResourceLinks(input: ResourceRecommendationInput) {
  const tokens = tokenizeTopic(input.topic)
  const dominantStyle = input.dominantStyle?.toLowerCase()
  const secondaryStyle = input.secondaryStyle?.toLowerCase()

  return varkResourceLibrary
    .map((resource) => {
      const tagScore = resource.tags.reduce((score, tag) => {
        return score + (tokens.some((token) => tag.includes(token) || token.includes(tag)) ? 2 : 0)
      }, 0)
      const styleScore =
        (dominantStyle && resource.styles.includes(dominantStyle) ? 3 : 0) +
        (secondaryStyle && resource.styles.includes(secondaryStyle) ? 1 : 0)
      const masteryScore =
        input.masteryLevel && input.masteryLevel >= 80 && resource.difficulty === "advanced"
          ? 1
          : input.masteryLevel && input.masteryLevel < 60 && resource.difficulty === "beginner"
            ? 1
            : 0

      return {
        resource,
        score: tagScore + styleScore + masteryScore,
      }
    })
    .sort((a, b) => b.score - a.score)
}

export function getFallbackResourceRecommendations(input: ResourceRecommendationInput, limit = 3) {
  const ranked = rankResourceLinks(input)
  const selected = ranked.filter((entry) => entry.score > 0).slice(0, limit)

  if (selected.length >= limit) {
    return selected.map(({ resource }) => resource)
  }

  const top = [...selected.map(({ resource }) => resource)]
  for (const entry of ranked) {
    if (top.length >= limit) break
    if (top.some((resource) => resource.id === entry.resource.id)) continue
    top.push(entry.resource)
  }

  return top.slice(0, limit)
}

export function buildResourceSelectionPrompt(input: ResourceRecommendationInput, limit = 3) {
  const shortlist = rankResourceLinks(input)
    .slice(0, 8)
    .map(({ resource }) => ({
      id: resource.id,
      title: resource.title,
      styles: resource.styles.join(", "),
      tags: resource.tags.join(", "),
      description: resource.description,
    }))

  return `
Select the best ${limit} resources for this student.
Return valid JSON only in this shape:
{"recommendations":[{"id":"resource-id","reason":"short reason"}]}

Student topic: ${input.topic}
Dominant style: ${input.dominantStyle || "unknown"}
Secondary style: ${input.secondaryStyle || "unknown"}
Mastery level: ${input.masteryLevel ?? 0}

Candidate resources:
${JSON.stringify(shortlist)}
  `.trim()
}
