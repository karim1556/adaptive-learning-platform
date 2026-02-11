'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff, Loader2, Waves } from 'lucide-react'

interface VoiceChatProps {
  studentName: string
  topic?: string
  mastery?: number
  onClose?: () => void
  className?: string
}

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function VoiceChat({ studentName, topic, mastery, onClose, className = '' }: VoiceChatProps) {
  const [isActive, setIsActive] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [language, setLanguage] = useState<'english' | 'hindi'>('english')
  const [transcript, setTranscript] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [error, setError] = useState('')
  const [conversation, setConversation] = useState<ConversationMessage[]>([])

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const startSession = async () => {
    try {
      setError('')
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      setIsActive(true)

      // Play greeting
      await playGreeting()
    } catch (err) {
      console.error('Microphone error:', err)
      setError('Could not access microphone. Please allow microphone access.')
    }
  }

  const endSession = () => {
    stopRecording()
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsActive(false)
    setIsListening(false)
    setTranscript('')
    setAiResponse('')
    onClose?.()
  }

  const playGreeting = async () => {
    setIsSpeaking(true)
    const greetingText = language === 'hindi' 
      ? `नमस्ते ${studentName}! मैं आपका AI शिक्षक हूं। ${topic ? `मैं ${topic} में आपकी मदद करने के लिए यहां हूं।` : ''} आज आप क्या सीखना चाहेंगे?`
      : `Hey ${studentName}! I'm your AI tutor. ${topic ? `I'm here to help you with ${topic}.` : ''} What would you like to learn about today?`
    setAiResponse(greetingText)

    try {
      const response = await fetch('/api/ai/voice/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'respond',
          text: greetingText,
          context: { studentName, topic, mastery, language },
        }),
      })

      const data = await response.json()
      if (data.audio) {
        await playAudio(data.audio)
      }
    } catch (err) {
      console.error('Greeting error:', err)
    }

    setIsSpeaking(false)
  }

  const startRecording = async () => {
    if (!streamRef.current || isProcessing || isSpeaking) return

    try {
      audioChunksRef.current = []
      
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'audio/webm;codecs=opus',
      })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          await processAudio()
        }
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(100) // Collect data every 100ms
      setIsListening(true)
      setTranscript('')
    } catch (err) {
      console.error('Recording error:', err)
      setError('Failed to start recording')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setIsListening(false)
    }
  }

  const processAudio = async () => {
    if (audioChunksRef.current.length === 0) return

    setIsProcessing(true)
    setError('')

    try {
      // Combine audio chunks
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      
      // Convert to base64
      const reader = new FileReader()
      const base64Audio = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(audioBlob)
      })

      // Send to server for processing
      const response = await fetch('/api/ai/voice/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: base64Audio,
          context: {
            studentName,
            topic,
            mastery,
            language,
            conversationHistory: conversation.slice(-6), // Last 6 messages for context
          },
        }),
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.error || 'Failed to process audio')
        setIsProcessing(false)
        return
      }

      // Update transcript
      setTranscript(data.transcript)
      
      // Add to conversation
      setConversation(prev => [
        ...prev,
        { role: 'user', content: data.transcript, timestamp: new Date() },
        { role: 'assistant', content: data.response, timestamp: new Date() },
      ])

      // Show AI response
      setAiResponse(data.response)

      // Play audio response
      if (data.audio && !isMuted) {
        setIsSpeaking(true)
        await playAudio(data.audio)
        setIsSpeaking(false)
      }
    } catch (err) {
      console.error('Process error:', err)
      setError('Failed to process your speech. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const playAudio = (audioDataUrl: string): Promise<void> => {
    return new Promise((resolve) => {
      if (audioRef.current) {
        audioRef.current.pause()
      }

      const audio = new Audio(audioDataUrl)
      audioRef.current = audio
      audio.volume = isMuted ? 0 : 1

      audio.onended = () => resolve()
      audio.onerror = () => resolve()
      
      audio.play().catch(() => resolve())
    })
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 1 : 0
    }
  }

  // Handle push-to-talk
  const handleMicPress = () => {
    if (!isActive) {
      startSession()
    } else if (isListening) {
      stopRecording()
    } else if (!isProcessing && !isSpeaking) {
      startRecording()
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Hidden audio element */}
      <audio ref={audioRef} className="hidden" />

      {!isActive ? (
        <div className="space-y-3">
          {/* Language Selection */}
          <div className="flex gap-2">
            <button
              onClick={() => setLanguage('english')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
                language === 'english'
                  ? 'bg-purple-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage('hindi')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
                language === 'hindi'
                  ? 'bg-purple-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              हिंदी (Hindi)
            </button>
          </div>

          {/* Start button */}
          <button
            onClick={startSession}
            className="w-full flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Mic className="w-6 h-6" />
            </div>
            <div className="text-left">
              <p className="font-semibold">Start Voice Chat</p>
              <p className="text-sm text-white/80">
                {language === 'hindi' ? 'अपने AI शिक्षक से बात करें' : 'Talk to your AI tutor'}
              </p>
            </div>
          </button>
        </div>
      ) : (
        // Active voice chat UI
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-2xl min-w-[320px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isSpeaking ? 'bg-green-400 animate-pulse' : isListening ? 'bg-red-400 animate-pulse' : 'bg-slate-500'}`} />
              <div>
                <span className="text-white font-medium block">
                  {isSpeaking ? (language === 'hindi' ? 'AI बोल रहा है...' : 'AI Speaking...') 
                    : isListening ? (language === 'hindi' ? 'सुन रहा है...' : 'Listening...') 
                    : isProcessing ? (language === 'hindi' ? 'प्रोसेस हो रहा है...' : 'Processing...') 
                    : (language === 'hindi' ? 'तैयार' : 'Ready')}
                </span>
                <span className="text-xs text-slate-400">{language === 'hindi' ? 'हिंदी' : 'English'}</span>
              </div>
            </div>
            <button
              onClick={endSession}
              className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>

          {/* Visualization */}
          <div className="flex items-center justify-center h-32 mb-6">
            {isListening || isSpeaking ? (
              <div className="flex items-center gap-1">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 rounded-full ${isSpeaking ? 'bg-green-400' : 'bg-purple-400'}`}
                    style={{
                      height: `${20 + Math.random() * 60}px`,
                      animation: `pulse 0.5s ease-in-out ${i * 0.1}s infinite alternate`,
                    }}
                  />
                ))}
              </div>
            ) : isProcessing ? (
              <Loader2 className="w-16 h-16 text-purple-400 animate-spin" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center">
                <Mic className="w-10 h-10 text-slate-400" />
              </div>
            )}
          </div>

          {/* Transcript/Response */}
          <div className="space-y-3 mb-6 max-h-40 overflow-y-auto">
            {transcript && (
              <div className="bg-slate-700/50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">
                  {language === 'hindi' ? 'आपने कहा:' : 'You said:'}
                </p>
                <p className="text-sm text-white">{transcript}</p>
              </div>
            )}
            {aiResponse && (
              <div className="bg-purple-500/20 rounded-lg p-3">
                <p className="text-xs text-purple-300 mb-1">
                  {language === 'hindi' ? 'AI शिक्षक:' : 'AI Tutor:'}
                </p>
                <p className="text-sm text-white">{aiResponse}</p>
              </div>
            )}
            {error && (
              <div className="bg-red-500/20 rounded-lg p-3">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            {/* Mute button */}
            <button
              onClick={toggleMute}
              className={`p-3 rounded-full transition ${
                isMuted ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* Main mic button (push to talk) */}
            <button
              onMouseDown={handleMicPress}
              onMouseUp={isListening ? stopRecording : undefined}
              onTouchStart={handleMicPress}
              onTouchEnd={isListening ? stopRecording : undefined}
              disabled={isProcessing || isSpeaking}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                isListening
                  ? 'bg-red-500 hover:bg-red-600 scale-110'
                  : isProcessing || isSpeaking
                  ? 'bg-slate-600 cursor-not-allowed'
                  : 'bg-purple-500 hover:bg-purple-600 hover:scale-105'
              }`}
            >
              {isProcessing ? (
                <Loader2 className="w-7 h-7 text-white animate-spin" />
              ) : isListening ? (
                <MicOff className="w-7 h-7 text-white" />
              ) : (
                <Mic className="w-7 h-7 text-white" />
              )}
            </button>

            {/* End call button */}
            <button
              onClick={endSession}
              className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition"
            >
              <Phone className="w-5 h-5" />
            </button>
          </div>

          {/* Instructions */}
          <p className="text-center text-xs text-slate-400 mt-4">
            {language === 'hindi' 
              ? (isListening ? 'भेजने के लिए छोड़ें' : isProcessing ? 'आपका संदेश प्रोसेस हो रहा है...' : isSpeaking ? 'जवाब सुन रहे हैं...' : 'बोलने के लिए माइक बटन दबाएं')
              : (isListening ? 'Release to send' : isProcessing ? 'Processing your message...' : isSpeaking ? 'Listening to response...' : 'Hold mic button to speak')
            }
          </p>
        </div>
      )}

      {/* Pulse animation styles */}
      <style jsx>{`
        @keyframes pulse {
          from { transform: scaleY(0.5); }
          to { transform: scaleY(1); }
        }
      `}</style>
    </div>
  )
}

export default VoiceChat
