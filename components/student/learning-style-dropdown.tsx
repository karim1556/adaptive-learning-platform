'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Eye, Ear, BookText, Hand, Check } from 'lucide-react'

export type LearningStyleOption = {
  id: 'reading' | 'visual' | 'auditory' | 'kinesthetic'
  label: string
  icon: typeof Eye
  color: string
  bgColor: string
  description: string
}

export const LEARNING_STYLES: LearningStyleOption[] = [
  {
    id: 'reading',
    label: 'Reading',
    icon: BookText,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500',
    description: 'Clear text explanations',
  },
  {
    id: 'visual',
    label: 'Visual',
    icon: Eye,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500',
    description: 'Diagrams & visual aids',
  },
  {
    id: 'auditory',
    label: 'Auditory',
    icon: Ear,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500',
    description: 'Audio explanations',
  },
  {
    id: 'kinesthetic',
    label: 'Kinesthetic',
    icon: Hand,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500',
    description: 'Hands-on activities',
  },
]

interface LearningStyleDropdownProps {
  value: LearningStyleOption['id']
  onChange: (style: LearningStyleOption['id']) => void
  availableStyles?: LearningStyleOption['id'][]
  className?: string
}

export function LearningStyleDropdown({
  value,
  onChange,
  availableStyles,
  className = '',
}: LearningStyleDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filter to only available styles, or show all if not specified
  const styles = availableStyles
    ? LEARNING_STYLES.filter((s) => availableStyles.includes(s.id))
    : LEARNING_STYLES

  const selectedStyle = LEARNING_STYLES.find((s) => s.id === value) || styles[0]
  const SelectedIcon = selectedStyle.icon

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors border border-slate-200 dark:border-slate-600"
      >
        <div className={`w-5 h-5 rounded flex items-center justify-center ${selectedStyle.bgColor}`}>
          <SelectedIcon className="w-3 h-3 text-white" />
        </div>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {selectedStyle.label}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 bottom-full mb-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
          <div className="p-2 border-b border-slate-100 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 px-2">
              Select Learning Style
            </p>
          </div>
          <div className="p-2">
            {styles.map((style) => {
              const StyleIcon = style.icon
              const isSelected = style.id === value

              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => {
                    onChange(style.id)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-slate-100 dark:bg-slate-700'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${style.bgColor}`}>
                    <StyleIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {style.label}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {style.description}
                    </p>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-emerald-500" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default LearningStyleDropdown
