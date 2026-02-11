'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Loader2, RotateCcw } from 'lucide-react'

interface AudioPlayerProps {
  text: string
  onLoad?: () => void
  className?: string
}

export function AudioPlayer({ text, onLoad, className = '' }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string>('')
  const [error, setError] = useState<string>('')
  const audioRef = useRef<HTMLAudioElement>(null)

  // Generate audio when text changes
  useEffect(() => {
    const generateAudio = async () => {
      if (!text) return

      setIsLoading(true)
      setError('')

      try {
        const response = await fetch('/api/ai/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })

        const data = await response.json()

        if (data.success && data.audio) {
          setAudioUrl(data.audio)
          onLoad?.()
        } else {
          setError(data.error || 'Failed to generate audio')
        }
      } catch (err) {
        console.error('Audio generation error:', err)
        setError('Failed to connect to audio service')
      } finally {
        setIsLoading(false)
      }
    }

    generateAudio()
  }, [text, onLoad])

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      setProgress((audio.currentTime / audio.duration) * 100 || 0)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setProgress(0)
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [audioUrl])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return

    audio.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const restart = () => {
    const audio = audioRef.current
    if (!audio) return

    audio.currentTime = 0
    audio.play()
    setIsPlaying(true)
  }

  if (error) {
    return (
      <div className={`p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg ${className}`}>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          🔇 Audio unavailable: {error}
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
          Reading the text below instead:
        </p>
      </div>
    )
  }

  return (
    <div className={`bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-4 ${className}`}>
      <audio ref={audioRef} src={audioUrl} preload="auto" />
      
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          disabled={isLoading || !audioUrl}
          className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-5 h-5 text-purple-600" />
          ) : (
            <Play className="w-5 h-5 text-purple-600 ml-0.5" />
          )}
        </button>

        {/* Progress Bar */}
        <div className="flex-1">
          <div className="h-2 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-white/80 mt-1">
            {isLoading ? 'Generating audio...' : isPlaying ? 'Playing explanation...' : 'Click play to listen'}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={restart}
            disabled={isLoading || !audioUrl}
            className="p-2 text-white/80 hover:text-white transition disabled:opacity-50"
            title="Restart"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={toggleMute}
            disabled={isLoading || !audioUrl}
            className="p-2 text-white/80 hover:text-white transition disabled:opacity-50"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AudioPlayer
