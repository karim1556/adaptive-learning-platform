export interface ChildProgress {
  name: string
  masteryScore: number
  engagementLevel: number
  dominantStyle: string
  recentActivity: string
  supportRecommendations: string[]
}

export interface ParentDashboardData {
  parentName: string
  children: ChildProgress[]
  familyEngagementTrend: Array<{
    date: string
    avgMastery: number
  }>
}

export function getParentData(parentId: string): ParentDashboardData {
  // Return a fresh parent profile with no linked children
  // Each parent gets their own isolated dashboard - children must be linked explicitly
  return {
    parentName: "Parent",
    children: [], // No children linked by default - must be done explicitly
    familyEngagementTrend: [],
  }
}
