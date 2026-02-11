import { StudentSoftSkillsView } from "@/components/teacher/student-soft-skills-view"

interface StudentInsightsProps {
  student: { id: string; name?: string }
}

export function StudentInsights({ student }: StudentInsightsProps) {
  return (
    <div className="space-y-6">
      <StudentSoftSkillsView studentId={student.id} studentName={student.name} />
    </div>
  )
}
