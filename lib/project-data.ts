export interface ProjectMilestone {
  id: string
  name: string
  dueDate: Date
  status: "pending" | "in-progress" | "completed"
  submissions: number
}

export interface Project {
  id: string
  title: string
  description: string
  concept: string
  difficulty?: "Easy" | "Medium" | "Hard"
  learningStyles?: string[]
  dueDate: Date
  teams: Array<{
    id: string
    name: string
    members: string[]
    milestones: ProjectMilestone[]
    overallProgress: number
  }>
  createdBy: string
}

const PROJECT_STORE_KEY = "adaptiq_projects_v1"

function loadProjectsFromStore(): Record<string, Project[]> | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(PROJECT_STORE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    // revive dates
    Object.values(parsed).forEach((arr: Project[]) => {
      arr.forEach((p) => {
        p.dueDate = new Date(p.dueDate)
        p.teams?.forEach((t) => t.milestones?.forEach((m) => (m.dueDate = new Date(m.dueDate))))
      })
    })
    return parsed
  } catch {
    return null
  }
}

function saveProjectsToStore(data: Record<string, Project[]>) {
  if (typeof window === "undefined") return
  localStorage.setItem(PROJECT_STORE_KEY, JSON.stringify(data))
}

export function createProject(teacherId: string, payload: {
  title: string
  description?: string
  concept?: string
  dueDate?: string | Date
  difficulty?: "Easy" | "Medium" | "Hard"
  learningStyles?: string[]
}) {
  const store = loadProjectsFromStore() || {}
  const list = store[teacherId] || getProjectsForTeacher(teacherId)
  const id = Math.random().toString(36).slice(2, 10)
  const newProject: Project = {
    id,
    title: payload.title,
    description: payload.description || "",
    concept: payload.concept || "General",
    difficulty: payload.difficulty,
    learningStyles: payload.learningStyles || [],
    dueDate: payload.dueDate ? new Date(payload.dueDate) : new Date(),
    createdBy: teacherId,
    teams: [],
  }

  store[teacherId] = [newProject, ...list]
  saveProjectsToStore(store)
  return newProject
}

export function getProjectsForTeacher(teacherId: string): Project[] {
  const persisted = loadProjectsFromStore()
  if (persisted && persisted[teacherId]) return persisted[teacherId]

  return [
    {
      id: "g0000000-0000-0000-0000-000000000001",
      title: "Real-World Linear Equations",
      description: "Apply linear equations to solve real-world business and engineering problems",
      concept: "Linear Equations",
      dueDate: new Date("2024-02-15"),
      createdBy: teacherId,
      teams: [
        {
          id: "h0000000-0000-0000-0000-000000000001",
          name: "Team Alpha",
          members: ["Alex Johnson", "Jordan Smith"],
          overallProgress: 65,
          milestones: [
            {
              id: "i0000000-0000-0000-0000-000000000001",
              name: "Research & Planning",
              dueDate: new Date("2024-01-25"),
              status: "completed",
              submissions: 1,
            },
            {
              id: "i0000000-0000-0000-0000-000000000002",
              name: "Draft Report",
              dueDate: new Date("2024-02-05"),
              status: "in-progress",
              submissions: 0,
            },
          ],
        },
      ],
    },
    {
      id: "g0000000-0000-0000-0000-000000000002",
      title: "Ramp Experiment",
      description: "Hands-on kinematics experiment exploring motion on inclined planes",
      concept: "Kinematics",
      dueDate: new Date("2024-02-10"),
      createdBy: teacherId,
      teams: [
        {
          id: "h0000000-0000-0000-0000-000000000003",
          name: "Physics Team",
          members: ["Casey Williams", "Morgan Brown"],
          overallProgress: 45,
          milestones: [
            {
              id: "i0000000-0000-0000-0000-000000000003",
              name: "Setup Experiment",
              dueDate: new Date("2024-01-22"),
              status: "completed",
              submissions: 1,
            },
            {
              id: "i0000000-0000-0000-0000-000000000004",
              name: "Data Collection",
              dueDate: new Date("2024-02-01"),
              status: "in-progress",
              submissions: 0,
            },
          ],
        },
      ],
    },
  ]
}

export function getStudentProjects(studentId: string): Project[] {
  // Filter projects where student is a team member
  const allProjects = getProjectsForTeacher("55555555-5555-5555-5555-555555555555")

  return allProjects.filter((project) =>
    project.teams.some((team) => team.members.some((member) => member.includes("Alex"))),
  )
}
