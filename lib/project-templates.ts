/**
 * Project Template Library Service
 * 
 * Provides searchable, curriculum-aligned, ready-to-use project templates
 * to reduce teacher workload
 */

export interface ProjectTemplate {
  id: string
  title: string
  description: string
  subject: string
  gradeLevel: string[]
  duration: string // e.g., "2 weeks", "1 month"
  difficulty: "Easy" | "Medium" | "Hard"
  learningStyles: ("visual" | "auditory" | "reading" | "kinesthetic")[]
  skills: string[] // Soft skills targeted
  concepts: string[] // Academic concepts covered
  milestones: {
    name: string
    description: string
    durationDays: number
    deliverables: string[]
  }[]
  rubric: {
    criteria: string
    weight: number
    levels: { score: number; description: string }[]
  }[]
  resources: {
    title: string
    type: "video" | "article" | "worksheet" | "tool"
    url?: string
  }[]
  tags: string[]
  usageCount: number
  rating: number
  createdBy: string
}

// Pre-built project templates library
export const projectTemplates: ProjectTemplate[] = [
  {
    id: "tpl-math-real-world-equations",
    title: "Real-World Linear Equations",
    description: "Students apply linear equations to solve authentic business and engineering problems, presenting their solutions through visual models.",
    subject: "Mathematics",
    gradeLevel: ["Grade 7", "Grade 8", "Grade 9"],
    duration: "2 weeks",
    difficulty: "Medium",
    learningStyles: ["visual", "kinesthetic"],
    skills: ["problem-solving", "communication", "creativity"],
    concepts: ["linear-equations", "graphing", "slope-intercept"],
    milestones: [
      {
        name: "Problem Identification",
        description: "Identify a real-world scenario that can be modeled with linear equations",
        durationDays: 3,
        deliverables: ["Problem statement", "Initial hypothesis"]
      },
      {
        name: "Mathematical Modeling",
        description: "Create linear equations to model the scenario",
        durationDays: 4,
        deliverables: ["Equation(s)", "Variable definitions", "Graph"]
      },
      {
        name: "Solution & Presentation",
        description: "Solve the problem and present findings",
        durationDays: 4,
        deliverables: ["Solution with explanation", "Visual presentation", "Reflection"]
      }
    ],
    rubric: [
      {
        criteria: "Mathematical Accuracy",
        weight: 30,
        levels: [
          { score: 4, description: "All equations correct with clear justification" },
          { score: 3, description: "Minor errors, good understanding shown" },
          { score: 2, description: "Some errors, partial understanding" },
          { score: 1, description: "Major errors, limited understanding" }
        ]
      },
      {
        criteria: "Real-World Application",
        weight: 25,
        levels: [
          { score: 4, description: "Excellent connection to real scenario" },
          { score: 3, description: "Good application with some gaps" },
          { score: 2, description: "Basic application" },
          { score: 1, description: "Weak or missing application" }
        ]
      },
      {
        criteria: "Presentation Quality",
        weight: 25,
        levels: [
          { score: 4, description: "Clear, engaging, well-organized" },
          { score: 3, description: "Clear with minor issues" },
          { score: 2, description: "Understandable but needs improvement" },
          { score: 1, description: "Unclear or disorganized" }
        ]
      },
      {
        criteria: "Collaboration",
        weight: 20,
        levels: [
          { score: 4, description: "Excellent teamwork throughout" },
          { score: 3, description: "Good collaboration" },
          { score: 2, description: "Some collaboration" },
          { score: 1, description: "Limited teamwork" }
        ]
      }
    ],
    resources: [
      { title: "Graphing Linear Equations Tutorial", type: "video" },
      { title: "Real-World Math Problems Worksheet", type: "worksheet" },
      { title: "Desmos Graphing Calculator", type: "tool", url: "https://www.desmos.com/calculator" }
    ],
    tags: ["algebra", "graphing", "real-world", "STEM"],
    usageCount: 245,
    rating: 4.7,
    createdBy: "AdaptIQ Team"
  },
  {
    id: "tpl-science-ecosystem",
    title: "Design an Ecosystem",
    description: "Students research and design a balanced ecosystem, considering food chains, energy flow, and environmental factors.",
    subject: "Science",
    gradeLevel: ["Grade 6", "Grade 7", "Grade 8"],
    duration: "3 weeks",
    difficulty: "Medium",
    learningStyles: ["visual", "kinesthetic", "reading"],
    skills: ["creativity", "problem-solving", "teamwork", "communication"],
    concepts: ["ecosystems", "food-chains", "biodiversity", "energy-flow"],
    milestones: [
      {
        name: "Research Phase",
        description: "Research different ecosystems and their components",
        durationDays: 5,
        deliverables: ["Research notes", "Ecosystem comparison chart"]
      },
      {
        name: "Design Phase",
        description: "Design your balanced ecosystem with all components",
        durationDays: 6,
        deliverables: ["Ecosystem diagram", "Species list", "Food web"]
      },
      {
        name: "Build & Present",
        description: "Create a model or presentation of your ecosystem",
        durationDays: 5,
        deliverables: ["Physical/digital model", "Presentation", "Peer feedback form"]
      }
    ],
    rubric: [
      {
        criteria: "Scientific Accuracy",
        weight: 30,
        levels: [
          { score: 4, description: "All ecological concepts correctly applied" },
          { score: 3, description: "Minor scientific errors" },
          { score: 2, description: "Some misconceptions present" },
          { score: 1, description: "Major scientific errors" }
        ]
      },
      {
        criteria: "Creativity & Design",
        weight: 25,
        levels: [
          { score: 4, description: "Highly creative and original design" },
          { score: 3, description: "Good creativity shown" },
          { score: 2, description: "Some creative elements" },
          { score: 1, description: "Little creativity" }
        ]
      },
      {
        criteria: "Teamwork",
        weight: 25,
        levels: [
          { score: 4, description: "Exceptional collaboration" },
          { score: 3, description: "Good teamwork" },
          { score: 2, description: "Adequate collaboration" },
          { score: 1, description: "Poor teamwork" }
        ]
      },
      {
        criteria: "Presentation",
        weight: 20,
        levels: [
          { score: 4, description: "Engaging and informative" },
          { score: 3, description: "Clear presentation" },
          { score: 2, description: "Basic presentation" },
          { score: 1, description: "Unclear presentation" }
        ]
      }
    ],
    resources: [
      { title: "Ecosystem Basics Video", type: "video" },
      { title: "Food Web Builder Tool", type: "tool" },
      { title: "Biodiversity Article", type: "article" }
    ],
    tags: ["biology", "ecology", "environment", "hands-on"],
    usageCount: 189,
    rating: 4.5,
    createdBy: "AdaptIQ Team"
  },
  {
    id: "tpl-history-documentary",
    title: "Historical Documentary Project",
    description: "Students create a short documentary about a historical event, incorporating primary sources and multiple perspectives.",
    subject: "History",
    gradeLevel: ["Grade 8", "Grade 9", "Grade 10"],
    duration: "4 weeks",
    difficulty: "Hard",
    learningStyles: ["auditory", "visual", "reading"],
    skills: ["communication", "creativity", "teamwork", "problem-solving"],
    concepts: ["primary-sources", "historical-analysis", "perspective-taking"],
    milestones: [
      {
        name: "Topic Selection & Research",
        description: "Choose event and gather primary/secondary sources",
        durationDays: 7,
        deliverables: ["Topic proposal", "Annotated bibliography", "Research notes"]
      },
      {
        name: "Script & Storyboard",
        description: "Write script and plan visual elements",
        durationDays: 7,
        deliverables: ["Script draft", "Storyboard", "Interview questions"]
      },
      {
        name: "Production",
        description: "Film and edit the documentary",
        durationDays: 7,
        deliverables: ["Raw footage", "Edited video"]
      },
      {
        name: "Premiere & Reflection",
        description: "Present documentary and reflect on process",
        durationDays: 3,
        deliverables: ["Final documentary", "Reflection essay", "Peer reviews"]
      }
    ],
    rubric: [
      {
        criteria: "Historical Accuracy",
        weight: 30,
        levels: [
          { score: 4, description: "Accurate, well-researched content" },
          { score: 3, description: "Mostly accurate with minor issues" },
          { score: 2, description: "Some inaccuracies" },
          { score: 1, description: "Significant historical errors" }
        ]
      },
      {
        criteria: "Use of Sources",
        weight: 25,
        levels: [
          { score: 4, description: "Excellent use of primary sources" },
          { score: 3, description: "Good source integration" },
          { score: 2, description: "Limited source use" },
          { score: 1, description: "Poor or missing sources" }
        ]
      },
      {
        criteria: "Production Quality",
        weight: 25,
        levels: [
          { score: 4, description: "Professional quality video" },
          { score: 3, description: "Good production values" },
          { score: 2, description: "Acceptable quality" },
          { score: 1, description: "Poor production" }
        ]
      },
      {
        criteria: "Collaboration",
        weight: 20,
        levels: [
          { score: 4, description: "Outstanding teamwork" },
          { score: 3, description: "Good collaboration" },
          { score: 2, description: "Some teamwork issues" },
          { score: 1, description: "Poor collaboration" }
        ]
      }
    ],
    resources: [
      { title: "Documentary Filmmaking Guide", type: "article" },
      { title: "Free Video Editing Tools", type: "tool" },
      { title: "How to Analyze Primary Sources", type: "video" }
    ],
    tags: ["history", "media", "research", "presentation"],
    usageCount: 156,
    rating: 4.6,
    createdBy: "AdaptIQ Team"
  },
  {
    id: "tpl-english-podcast",
    title: "Literature Analysis Podcast",
    description: "Students create a podcast episode analyzing themes, characters, or literary devices in a novel or play.",
    subject: "English",
    gradeLevel: ["Grade 9", "Grade 10", "Grade 11"],
    duration: "2 weeks",
    difficulty: "Medium",
    learningStyles: ["auditory", "reading"],
    skills: ["communication", "creativity", "problem-solving"],
    concepts: ["literary-analysis", "themes", "character-development"],
    milestones: [
      {
        name: "Analysis & Planning",
        description: "Analyze the text and plan podcast content",
        durationDays: 4,
        deliverables: ["Analysis notes", "Podcast outline"]
      },
      {
        name: "Script Writing",
        description: "Write the podcast script",
        durationDays: 4,
        deliverables: ["Full script", "Discussion questions"]
      },
      {
        name: "Recording & Editing",
        description: "Record and edit the podcast episode",
        durationDays: 4,
        deliverables: ["Audio recording", "Episode artwork"]
      }
    ],
    rubric: [
      {
        criteria: "Literary Analysis",
        weight: 35,
        levels: [
          { score: 4, description: "Deep, insightful analysis" },
          { score: 3, description: "Good analysis" },
          { score: 2, description: "Surface-level analysis" },
          { score: 1, description: "Weak analysis" }
        ]
      },
      {
        criteria: "Communication",
        weight: 30,
        levels: [
          { score: 4, description: "Clear, engaging delivery" },
          { score: 3, description: "Good communication" },
          { score: 2, description: "Adequate delivery" },
          { score: 1, description: "Unclear communication" }
        ]
      },
      {
        criteria: "Creativity",
        weight: 20,
        levels: [
          { score: 4, description: "Highly creative approach" },
          { score: 3, description: "Some creativity" },
          { score: 2, description: "Basic approach" },
          { score: 1, description: "No creativity shown" }
        ]
      },
      {
        criteria: "Technical Quality",
        weight: 15,
        levels: [
          { score: 4, description: "Professional audio quality" },
          { score: 3, description: "Good quality" },
          { score: 2, description: "Acceptable" },
          { score: 1, description: "Poor quality" }
        ]
      }
    ],
    resources: [
      { title: "Podcast Recording Tips", type: "video" },
      { title: "Literary Analysis Framework", type: "worksheet" },
      { title: "Free Audio Editor - Audacity", type: "tool", url: "https://www.audacityteam.org/" }
    ],
    tags: ["literature", "speaking", "audio", "analysis"],
    usageCount: 134,
    rating: 4.4,
    createdBy: "AdaptIQ Team"
  },
  {
    id: "tpl-stem-bridge",
    title: "Engineering Bridge Challenge",
    description: "Teams design and build a bridge using limited materials, testing structural integrity and documenting the engineering process.",
    subject: "STEM",
    gradeLevel: ["Grade 6", "Grade 7", "Grade 8"],
    duration: "2 weeks",
    difficulty: "Medium",
    learningStyles: ["kinesthetic", "visual"],
    skills: ["problem-solving", "teamwork", "creativity", "communication"],
    concepts: ["engineering-design", "forces", "structures", "materials"],
    milestones: [
      {
        name: "Research & Design",
        description: "Research bridge types and create design sketches",
        durationDays: 4,
        deliverables: ["Research summary", "Design sketches", "Materials list"]
      },
      {
        name: "Construction",
        description: "Build the bridge prototype",
        durationDays: 5,
        deliverables: ["Bridge prototype", "Construction log"]
      },
      {
        name: "Testing & Presentation",
        description: "Test the bridge and present findings",
        durationDays: 3,
        deliverables: ["Test results", "Presentation", "Reflection"]
      }
    ],
    rubric: [
      {
        criteria: "Structural Integrity",
        weight: 30,
        levels: [
          { score: 4, description: "Exceeds weight requirements" },
          { score: 3, description: "Meets requirements" },
          { score: 2, description: "Partially meets requirements" },
          { score: 1, description: "Does not meet requirements" }
        ]
      },
      {
        criteria: "Engineering Process",
        weight: 25,
        levels: [
          { score: 4, description: "Thorough documentation of process" },
          { score: 3, description: "Good documentation" },
          { score: 2, description: "Basic documentation" },
          { score: 1, description: "Poor documentation" }
        ]
      },
      {
        criteria: "Design Innovation",
        weight: 25,
        levels: [
          { score: 4, description: "Innovative, creative design" },
          { score: 3, description: "Good design choices" },
          { score: 2, description: "Standard design" },
          { score: 1, description: "Poor design" }
        ]
      },
      {
        criteria: "Teamwork",
        weight: 20,
        levels: [
          { score: 4, description: "Excellent collaboration" },
          { score: 3, description: "Good teamwork" },
          { score: 2, description: "Some collaboration" },
          { score: 1, description: "Poor teamwork" }
        ]
      }
    ],
    resources: [
      { title: "Bridge Engineering Basics", type: "video" },
      { title: "Forces and Structures Guide", type: "article" },
      { title: "Design Planning Template", type: "worksheet" }
    ],
    tags: ["engineering", "hands-on", "physics", "design"],
    usageCount: 278,
    rating: 4.8,
    createdBy: "AdaptIQ Team"
  },
  {
    id: "tpl-social-studies-campaign",
    title: "Community Awareness Campaign",
    description: "Students identify a local issue and create an awareness campaign using multiple media formats.",
    subject: "Social Studies",
    gradeLevel: ["Grade 7", "Grade 8", "Grade 9"],
    duration: "3 weeks",
    difficulty: "Medium",
    learningStyles: ["visual", "auditory", "kinesthetic"],
    skills: ["communication", "creativity", "leadership", "problem-solving"],
    concepts: ["civic-engagement", "media-literacy", "community-issues"],
    milestones: [
      {
        name: "Issue Research",
        description: "Identify and research a local community issue",
        durationDays: 5,
        deliverables: ["Issue brief", "Stakeholder map", "Interview notes"]
      },
      {
        name: "Campaign Development",
        description: "Create campaign strategy and materials",
        durationDays: 7,
        deliverables: ["Campaign plan", "Poster/flyer", "Social media content"]
      },
      {
        name: "Implementation & Reflection",
        description: "Present campaign and reflect on impact",
        durationDays: 5,
        deliverables: ["Campaign presentation", "Impact report", "Reflection"]
      }
    ],
    rubric: [
      {
        criteria: "Issue Understanding",
        weight: 25,
        levels: [
          { score: 4, description: "Deep understanding of issue" },
          { score: 3, description: "Good understanding" },
          { score: 2, description: "Basic understanding" },
          { score: 1, description: "Limited understanding" }
        ]
      },
      {
        criteria: "Campaign Effectiveness",
        weight: 30,
        levels: [
          { score: 4, description: "Compelling, actionable campaign" },
          { score: 3, description: "Effective campaign" },
          { score: 2, description: "Adequate campaign" },
          { score: 1, description: "Weak campaign" }
        ]
      },
      {
        criteria: "Media Quality",
        weight: 25,
        levels: [
          { score: 4, description: "Professional quality materials" },
          { score: 3, description: "Good quality" },
          { score: 2, description: "Acceptable quality" },
          { score: 1, description: "Poor quality" }
        ]
      },
      {
        criteria: "Collaboration",
        weight: 20,
        levels: [
          { score: 4, description: "Outstanding teamwork" },
          { score: 3, description: "Good collaboration" },
          { score: 2, description: "Some teamwork" },
          { score: 1, description: "Poor collaboration" }
        ]
      }
    ],
    resources: [
      { title: "Campaign Planning Guide", type: "article" },
      { title: "Canva Design Tool", type: "tool", url: "https://www.canva.com" },
      { title: "Effective Messaging Tips", type: "video" }
    ],
    tags: ["civic", "community", "media", "advocacy"],
    usageCount: 112,
    rating: 4.3,
    createdBy: "AdaptIQ Team"
  }
]

/**
 * Search templates by various criteria
 */
export function searchTemplates(query: {
  searchText?: string
  subject?: string
  gradeLevel?: string
  difficulty?: string
  learningStyles?: string[]
  skills?: string[]
  duration?: string
}): ProjectTemplate[] {
  let results = [...projectTemplates]

  if (query.searchText) {
    const text = query.searchText.toLowerCase()
    results = results.filter(t => 
      t.title.toLowerCase().includes(text) ||
      t.description.toLowerCase().includes(text) ||
      t.tags.some(tag => tag.toLowerCase().includes(text)) ||
      t.concepts.some(c => c.toLowerCase().includes(text))
    )
  }

  if (query.subject) {
    results = results.filter(t => t.subject.toLowerCase() === query.subject?.toLowerCase())
  }

  if (query.gradeLevel) {
    results = results.filter(t => t.gradeLevel.includes(query.gradeLevel!))
  }

  if (query.difficulty) {
    results = results.filter(t => t.difficulty === query.difficulty)
  }

  if (query.learningStyles && query.learningStyles.length > 0) {
    results = results.filter(t => 
      query.learningStyles!.some(s => t.learningStyles.includes(s as any))
    )
  }

  if (query.skills && query.skills.length > 0) {
    results = results.filter(t =>
      query.skills!.some(s => t.skills.includes(s))
    )
  }

  return results.sort((a, b) => b.rating - a.rating)
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): ProjectTemplate | null {
  return projectTemplates.find(t => t.id === id) || null
}

/**
 * Get all available subjects
 */
export function getAvailableSubjects(): string[] {
  return [...new Set(projectTemplates.map(t => t.subject))]
}

/**
 * Get all available grade levels
 */
export function getAvailableGradeLevels(): string[] {
  const grades = new Set<string>()
  projectTemplates.forEach(t => t.gradeLevel.forEach(g => grades.add(g)))
  return [...grades].sort()
}

/**
 * Convert template to project creation payload
 */
export function templateToProjectPayload(
  template: ProjectTemplate,
  teacherId: string,
  classId: string,
  startDate: Date
): {
  title: string
  description: string
  conceptId: string
  dueDate: string
  difficulty: "Easy" | "Medium" | "Hard"
  learningStyles: string[]
  classId: string
} {
  // Calculate due date based on duration
  const durationMatch = template.duration.match(/(\d+)\s*(week|month|day)/i)
  let daysToAdd = 14 // default 2 weeks
  
  if (durationMatch) {
    const num = parseInt(durationMatch[1])
    const unit = durationMatch[2].toLowerCase()
    if (unit.startsWith("month")) daysToAdd = num * 30
    else if (unit.startsWith("week")) daysToAdd = num * 7
    else daysToAdd = num
  }

  const dueDate = new Date(startDate)
  dueDate.setDate(dueDate.getDate() + daysToAdd)

  return {
    title: template.title,
    description: template.description,
    conceptId: template.concepts[0] || "general",
    dueDate: dueDate.toISOString(),
    difficulty: template.difficulty,
    learningStyles: template.learningStyles,
    classId
  }
}

export default {
  projectTemplates,
  searchTemplates,
  getTemplateById,
  getAvailableSubjects,
  getAvailableGradeLevels,
  templateToProjectPayload
}
