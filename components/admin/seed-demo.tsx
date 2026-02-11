"use client"

import React from "react"

export function SeedDemoData() {
  const seed = () => {
    try {
      const TEACHER_STORE = "adaptiq_teachers_v1"
      const STUDENT_STORE = "adaptiq_student_meta_v1"

      const demoTeachers = {
        "teacher-karim": {
          teacherId: "teacher-karim",
          name: "Karim Shaikh",
          department: "Maths",
          classes: [
            {
              className: "SE-B",
              classCode: "YZHJXF",
              studentCount: 3,
              averageMastery: 0,
              averageEngagement: 60,
              students: [
                { id: "stu-1", name: "Alex Johnson", email: "alex@student.com", masteryScore: 72, engagementLevel: 78, dominantLearningStyle: "Visual", recentActivity: "Quiz" },
                { id: "stu-2", name: "John Smith", email: "john@student.com", masteryScore: 45, engagementLevel: 62, dominantLearningStyle: "Reading", recentActivity: "Lesson" },
                { id: "stu-3", name: "Patricia Johnson", email: "patricia@student.com", masteryScore: 88, engagementLevel: 82, dominantLearningStyle: "Auditory", recentActivity: "Project" },
              ],
            },
          ],
          learningStyleDistribution: [
            { name: "Visual", value: 40 },
            { name: "Auditory", value: 30 },
            { name: "Reading", value: 20 },
            { name: "Kinesthetic", value: 10 },
          ],
          engagementTrends: [
            { date: "Jan 8", avgEngagement: 60, avgMastery: 70 },
            { date: "Jan 9", avgEngagement: 62, avgMastery: 71 },
            { date: "Jan 10", avgEngagement: 64, avgMastery: 71 },
          ],
          lowEngagementStudents: [],
          lowMasteryStudents: [],
        },
      }

      const demoStudentMeta = {
        "stu-1": { joinedClasses: [{ classCode: "YZHJXF", className: "SE-B", teacherId: "teacher-karim" }] },
        "stu-2": { joinedClasses: [{ classCode: "YZHJXF", className: "SE-B", teacherId: "teacher-karim" }] },
        "stu-3": { joinedClasses: [{ classCode: "YZHJXF", className: "SE-B", teacherId: "teacher-karim" }] },
      }

      localStorage.setItem(TEACHER_STORE, JSON.stringify(demoTeachers))
      localStorage.setItem(STUDENT_STORE, JSON.stringify(demoStudentMeta))

      // Reload to make UI pick up new data immediately
      window.location.reload()
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to seed demo data', e)
      alert('Failed to seed demo data: ' + e)
    }
  }

  return (
    <div className="mt-4">
      <button
        onClick={() => {
          if (!confirm('Seed demo admin data into browser localStorage? This will reload the page.')) return
          seed()
        }}
        className="px-3 py-2 rounded bg-blue-600 text-white text-sm"
      >
        Seed Demo Data
      </button>
    </div>
  )
}

export default SeedDemoData
