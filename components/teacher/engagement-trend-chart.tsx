"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface EngagementTrendData {
  date: string
  avgEngagement: number
  avgMastery: number
}

interface EngagementTrendChartProps {
  data: EngagementTrendData[]
}

export function EngagementTrendChart({ data }: EngagementTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Class Trends (7 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="avgEngagement" stroke="#3b82f6" name="Avg Engagement %" />
              <Line type="monotone" dataKey="avgMastery" stroke="#10b981" name="Avg Mastery %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
