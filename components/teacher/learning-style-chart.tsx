"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts"

interface LearningStyleChartProps {
  data: Array<{
    name: string
    value: number
  }>
}

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b"]

export function LearningStyleChart({ data }: LearningStyleChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Class Learning Style Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
