"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  projectTemplates,
  searchTemplates,
  getTemplateById,
  templateToProjectPayload,
  type ProjectTemplate
} from "@/lib/project-templates"
import {
  Search,
  BookOpen,
  Clock,
  Users,
  Tag,
  X,
  CheckCircle,
  Sparkles,
  ChevronRight,
  GraduationCap,
  Target,
  FileText,
  Lightbulb,
  Filter
} from "lucide-react"

interface ProjectTemplateLibraryProps {
  teacherId: string
  classId: string
  onSelectTemplate: (template: ProjectTemplate) => void
  onCreateFromTemplate: (payload: ReturnType<typeof templateToProjectPayload>) => void
  onClose: () => void
}

const subjectColors: Record<string, string> = {
  "Mathematics": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "Science": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  "History": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  "English": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  "Engineering": "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300",
  "Social Studies": "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400"
}

const difficultyConfig: Record<string, { color: string; label: string }> = {
  "Easy": { color: "bg-green-100 text-green-800", label: "Easy" },
  "Medium": { color: "bg-yellow-100 text-yellow-800", label: "Medium" },
  "Hard": { color: "bg-red-100 text-red-800", label: "Hard" }
}

export function ProjectTemplateLibrary({
  teacherId,
  classId,
  onSelectTemplate,
  onCreateFromTemplate,
  onClose
}: ProjectTemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null)

  const subjects = useMemo(() => {
    return [...new Set(projectTemplates.map(t => t.subject))]
  }, [])

  const filteredTemplates = useMemo(() => {
    let templates = projectTemplates

    if (searchQuery) {
      templates = searchTemplates({ searchText: searchQuery })
    }

    if (selectedSubject) {
      templates = templates.filter(t => t.subject === selectedSubject)
    }

    if (selectedDifficulty) {
      templates = templates.filter(t => t.difficulty === selectedDifficulty)
    }

    return templates
  }, [searchQuery, selectedSubject, selectedDifficulty])

  function handleUseTemplate() {
    if (!selectedTemplate) return
    const payload = templateToProjectPayload(selectedTemplate, teacherId, classId, new Date())
    onCreateFromTemplate(payload)
    onClose()
  }

  // Template Detail View
  if (selectedTemplate) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={subjectColors[selectedTemplate.subject] || "bg-slate-100"}>
                    {selectedTemplate.subject}
                  </Badge>
                  <Badge className={difficultyConfig[selectedTemplate.difficulty].color}>
                    {difficultyConfig[selectedTemplate.difficulty].label}
                  </Badge>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {selectedTemplate.title}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  {selectedTemplate.description}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedTemplate(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Meta Info */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <Clock className="w-5 h-5 text-indigo-600 mb-2" />
                <p className="text-sm text-slate-500">Duration</p>
                <p className="font-semibold">{selectedTemplate.duration}</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <GraduationCap className="w-5 h-5 text-indigo-600 mb-2" />
                <p className="text-sm text-slate-500">Grade Level</p>
                <p className="font-semibold">{selectedTemplate.gradeLevel.join(", ")}</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <Users className="w-5 h-5 text-indigo-600 mb-2" />
                <p className="text-sm text-slate-500">Skills Focus</p>
                <p className="font-semibold">{selectedTemplate.skills.length} skills</p>
              </div>
            </div>

            {/* Concepts Covered */}
            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-indigo-600" />
                Concepts Covered
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedTemplate.concepts.map((concept: string, idx: number) => (
                  <Badge key={idx} variant="outline">{concept}</Badge>
                ))}
              </div>
            </div>

            {/* Skills & Learning Objectives */}
            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-indigo-600" />
                Skills Targeted
              </h3>
              <ul className="space-y-2">
                {selectedTemplate.skills.map((skill: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    <span className="text-slate-600 dark:text-slate-400">{skill}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Milestones */}
            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-indigo-600" />
                Project Milestones ({selectedTemplate.milestones.length})
              </h3>
              <div className="space-y-3">
                {selectedTemplate.milestones.map((milestone, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-start gap-4 p-3 border rounded-lg"
                  >
                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center font-semibold text-indigo-600">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{milestone.name}</h4>
                        <Badge variant="secondary">{milestone.durationDays} days</Badge>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{milestone.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {milestone.deliverables.map((d, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{d}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rubric Preview */}
            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                Assessment Rubric
              </h3>
              <div className="space-y-2">
                {selectedTemplate.rubric.map((criterion, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <span className="font-medium">{criterion.criteria}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">{criterion.weight}%</span>
                      <Badge variant="secondary">
                        {criterion.levels.length} levels
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resources */}
            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Included Resources
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedTemplate.resources.map((resource, idx) => (
                  <Badge key={idx} variant="secondary">
                    {resource.type}: {resource.title}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setSelectedTemplate(null)}>
              Back to Templates
            </Button>
            <Button 
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              onClick={handleUseTemplate}
            >
              Use This Template
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Template List View
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-indigo-600" />
                Project Template Library
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Choose a curriculum-aligned template to jumpstart your project
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              <Button
                variant={selectedSubject === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedSubject(null)}
              >
                All
              </Button>
              {subjects.map((subject) => (
                <Button
                  key={subject}
                  variant={selectedSubject === subject ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSubject(selectedSubject === subject ? null : subject)}
                >
                  {subject}
                </Button>
              ))}
            </div>
          </div>

          {/* Difficulty Filter */}
          <div className="flex gap-2 mt-3">
            <Filter className="w-4 h-4 text-slate-400 mt-2" />
            {Object.entries(difficultyConfig).map(([key, config]) => (
              <Badge
                key={key}
                className={`cursor-pointer ${
                  selectedDifficulty === key 
                    ? config.color 
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
                onClick={() => setSelectedDifficulty(selectedDifficulty === key ? null : key)}
              >
                {config.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Template Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No templates match your search</p>
              <Button 
                variant="link" 
                onClick={() => { setSearchQuery(""); setSelectedSubject(null); setSelectedDifficulty(null) }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filteredTemplates.map((template) => (
                <Card 
                  key={template.id}
                  className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 hover:border-indigo-300"
                  onClick={() => setSelectedTemplate(template)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge className={subjectColors[template.subject] || "bg-slate-100"}>
                          {template.subject}
                        </Badge>
                        <Badge className={difficultyConfig[template.difficulty].color}>
                          {difficultyConfig[template.difficulty].label}
                        </Badge>
                      </div>
                    </div>
                    <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-2">
                      {template.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">
                      {template.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {template.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {template.skills.length} skills
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {template.milestones.length} milestones
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {template.tags.slice(0, 3).map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          <Tag className="w-2 h-2 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                      {template.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.tags.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 text-center text-sm text-slate-500">
          {filteredTemplates.length} template{filteredTemplates.length !== 1 ? "s" : ""} available
        </div>
      </div>
    </div>
  )
}
