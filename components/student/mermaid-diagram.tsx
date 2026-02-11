'use client'

import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

interface MermaidDiagramProps {
  code: string
  alt?: string
  className?: string
}

export function MermaidDiagram({ code, alt, className = '' }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [zoom, setZoom] = useState(100)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    // Initialize mermaid with enhanced settings for complex diagrams
    mermaid.initialize({
      startOnLoad: false,
      theme: 'neutral',
      securityLevel: 'loose',
      fontFamily: 'Inter, system-ui, sans-serif',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
        nodeSpacing: 50,
        rankSpacing: 50,
        padding: 15,
      },
      mindmap: {
        useMaxWidth: true,
        padding: 20,
      },
      themeVariables: {
        primaryColor: '#3b82f6',
        primaryTextColor: '#1e293b',
        primaryBorderColor: '#60a5fa',
        lineColor: '#64748b',
        secondaryColor: '#f1f5f9',
        tertiaryColor: '#e2e8f0',
      },
    })
  }, [])

  useEffect(() => {
    const renderDiagram = async () => {
      if (!code) return

      try {
        // Clean and validate the mermaid code
        const cleanCode = code.trim()
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const { svg: renderedSvg } = await mermaid.render(id, cleanCode)
        setSvg(renderedSvg)
        setError('')
      } catch (err) {
        console.error('Mermaid rendering error:', err)
        setError('Failed to render diagram. The diagram syntax may be invalid.')
      }
    }

    renderDiagram()
  }, [code])

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50))
  const toggleExpand = () => setIsExpanded(!isExpanded)

  if (error) {
    return (
      <div className={`p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg ${className}`}>
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <details className="mt-2">
          <summary className="text-xs text-red-500 cursor-pointer">Show diagram code</summary>
          <pre className="mt-2 text-xs text-red-500 overflow-x-auto whitespace-pre-wrap">{code}</pre>
        </details>
      </div>
    )
  }

  if (!svg) {
    return (
      <div className={`p-4 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse ${className}`}>
        <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
      </div>
    )
  }

  return (
    <div className={`relative ${isExpanded ? 'fixed inset-4 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl' : ''}`}>
      {/* Controls */}
      <div className={`flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-700 ${isExpanded ? 'rounded-t-2xl' : 'rounded-t-xl'} border-b border-slate-200 dark:border-slate-600`}>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          📊 Visual Diagram {zoom !== 100 && `(${zoom}%)`}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4 text-slate-500" />
          </button>
          <button
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4 text-slate-500" />
          </button>
          <button
            onClick={toggleExpand}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition ml-1"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            <Maximize2 className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>
      
      {/* Diagram */}
      <div
        ref={containerRef}
        className={`p-4 bg-white dark:bg-slate-800 border border-t-0 border-slate-200 dark:border-slate-700 ${isExpanded ? 'rounded-b-2xl overflow-auto' : 'rounded-b-xl overflow-x-auto'} ${className}`}
        style={{ 
          maxHeight: isExpanded ? 'calc(100vh - 120px)' : '500px',
          overflow: 'auto'
        }}
      >
        <div 
          style={{ 
            transform: `scale(${zoom / 100})`, 
            transformOrigin: 'top left',
            minWidth: 'fit-content'
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
          role="img"
          aria-label={alt || 'Diagram'}
        />
      </div>
      
      {/* Backdrop for expanded mode */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/50 -z-10"
          onClick={toggleExpand}
        />
      )}
    </div>
  )
}

export default MermaidDiagram
