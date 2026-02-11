"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import type { VARKProfile as VarkProfileType } from "@/lib/intelligence/varkEngine"

interface VARKProfileProps extends VarkProfileType {
  dominantStyle: string
  secondaryStyle: string
}

export function VARKProfile({
  visual,
  auditory,
  reading,
  kinesthetic,
  dominantStyle,
  secondaryStyle,
}: VARKProfileProps) {
  const data = [
    { name: "Visual", value: visual },
    { name: "Auditory", value: auditory },
    { name: "Reading", value: reading },
    { name: "Kinesthetic", value: kinesthetic },
  ]

  const getLearningDescriptions = {
    Visual: "You learn best through images, diagrams, and visual representations",
    Auditory: "You learn best through listening and verbal explanations",
    Reading: "You learn best through reading and written text",
    Kinesthetic: "You learn best through hands-on practice and physical interaction",
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Learning Preferences (VARK)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Badge variant="default" className="bg-blue-600">
            Dominant: {dominantStyle}
          </Badge>
          <Badge variant="outline">{secondaryStyle}</Badge>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {getLearningDescriptions[dominantStyle as keyof typeof getLearningDescriptions]}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
