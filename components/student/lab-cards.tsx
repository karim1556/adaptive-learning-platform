'use client'

import { ExternalLink, FlaskConical, Clock, BarChart } from 'lucide-react'

interface LabResource {
  title: string
  url: string
  provider: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  duration?: string
}

interface LabCardsProps {
  labs: LabResource[]
  className?: string
}

const difficultyColors = {
  beginner: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  advanced: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export function LabCards({ labs, className = '' }: LabCardsProps) {
  if (!labs || labs.length === 0) {
    return null
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        <FlaskConical className="w-4 h-4 text-orange-500" />
        <span>Interactive Labs & Resources</span>
      </div>
      
      <div className="grid gap-3">
        {labs.map((lab, index) => (
          <a
            key={index}
            href={lab.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block p-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800 rounded-xl hover:shadow-md transition-all hover:scale-[1.01]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors truncate">
                  {lab.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {lab.provider}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">
                  {lab.description}
                </p>
                
                <div className="flex items-center gap-3 mt-3">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${difficultyColors[lab.difficulty]}`}>
                    <BarChart className="w-3 h-3 inline-block mr-1" />
                    {lab.difficulty}
                  </span>
                  {lab.duration && (
                    <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <Clock className="w-3 h-3" />
                      {lab.duration}
                    </span>
                  )}
                </div>
              </div>
              
              <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-orange-500 transition-colors flex-shrink-0" />
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

export default LabCards
