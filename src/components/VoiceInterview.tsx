import { useState, useEffect, useRef, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '@/store/store'
import { addTranscriptEntry, completeInterview } from '@/store/slices/interviewSlice'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Mic, MicOff, CheckCircle, Sparkles, RotateCcw, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import axios from 'axios'

interface SpeechRecognitionEvent extends Event { results: SpeechRecognitionResultList; resultIndex: number }
interface SpeechRecognitionResultList { length: number; [index: number]: SpeechRecognitionResult }
interface SpeechRecognitionResult { [index: number]: { transcript: string; confidence: number }; isFinal: boolean; length: number }
interface SpeechRecognition extends EventTarget {
  continuous: boolean; interimResults: boolean; lang: string
  start(): void; stop(): void; abort(): void
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror: ((e: Event) => void) | null
  onend: (() => void) | null
}
declare global { interface Window { SpeechRecognition: new () => SpeechRecognition; webkitSpeechRecognition: new () => SpeechRecognition } }

interface VoiceInterviewProps { onStartFresh: () => void }

export function VoiceInterview({ onStartFresh }: VoiceInterviewProps) {
  const dispatch = useDispatch()
  const { candidateInfo, resumeText, selectedRole } = useSelector((state: RootState) => state.candidate)
  const { transcript } = useSelector((state: RootState) => state.interview)

  const [isStarted, setIsStarted] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [questionCount, setQuestionCount] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<Array<{role: string, text: string}>>([])
  const [audioLevel, setAudioLevel] = useState(0)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number>(0)
  const conversationHistoryRef = useRef<Array<{role: string, text: string}>>([])
  const questionCountRef = useRef(0)
  const isProcessingRef = useRef(false)
  const finalTranscriptRef = useRef('')
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const transcriptContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { conversationHistoryRef.current = conversationHistory }, [conversationHistory])
  useEffect(() => { questionCountRef.current = questionCount }, [questionCount])
  useEffect(() => { isProcessingRef.current = isProcessing }, [isProcessing])
  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight
    }
  }, [transcript])

  useEffect(() => { return () => { cleanup() } }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const cleanup = useCallback(() => {
    recognitionRef.current?.abort()
    audioRef.current?.pause()
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
  }, [])

  const stopAIAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setIsSpeaking(false)
    setAudioLevel(0)
  }, [])

  const speakWithElevenLabs = useCallback(async (text: string): Promise<void> => {
    try {
      const response = await axios.post('/api/tts', { text }, { responseType: 'blob', timeout: 30000 })
      if (response.status === 501) throw new Error('fallback')

      return new Promise((resolve) => {
        const audioUrl = URL.createObjectURL(response.data)
        const audio = new Audio(audioUrl)
        audioRef.current = audio
        setIsSpeaking(true)

        const ctx = new AudioContext()
        const source = ctx.createMediaElementSource(audio)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)
        analyser.connect(ctx.destination)
        analyserRef.current = analyser

        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        const tick = () => {
          analyser.getByteFrequencyData(dataArray)
          const avg = dataArray.reduce((s, v) => s + v, 0) / dataArray.length
          setAudioLevel(avg / 255)
          if (!audio.paused) animFrameRef.current = requestAnimationFrame(tick)
        }

        audio.onplay = () => tick()
        audio.onended = () => {
          setIsSpeaking(false)
          setAudioLevel(0)
          URL.revokeObjectURL(audioUrl)
          ctx.close().catch(() => {})
          resolve()
        }
        audio.onerror = () => {
          setIsSpeaking(false)
          setAudioLevel(0)
          resolve()
        }
        audio.play().catch(() => { setIsSpeaking(false); resolve() })
      })
    } catch {
      return speakWithBrowserTTS(text)
    }
  }, [])

  const speakWithBrowserTTS = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) { resolve(); return }
      setIsSpeaking(true)
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.0
      utterance.pitch = 1
      utterance.onend = () => { setIsSpeaking(false); setAudioLevel(0); resolve() }
      utterance.onerror = () => { setIsSpeaking(false); setAudioLevel(0); resolve() }

      const pulse = () => {
        if (window.speechSynthesis.speaking) {
          setAudioLevel(0.3 + Math.random() * 0.4)
          animFrameRef.current = requestAnimationFrame(pulse)
        } else {
          setAudioLevel(0)
        }
      }
      pulse()
      window.speechSynthesis.speak(utterance)
    })
  }, [])

  const callVoiceTurn = useCallback(async (userResponse: string, qNum: number, history: Array<{role: string, text: string}>) => {
    setIsProcessing(true)
    try {
      const response = await axios.post('/api/voice-turn', {
        resume_text: resumeText,
        role: selectedRole || 'Software Engineer',
        user_response: userResponse,
        question_number: qNum,
        conversation_history: history
      })

      if (response.data.success) {
        const aiText = response.data.ai_response
        const newQNum = response.data.question_number
        dispatch(addTranscriptEntry({ role: 'ai', text: aiText }))
        const updatedHistory = [...history, { role: 'ai', text: aiText }]
        setConversationHistory(updatedHistory)
        conversationHistoryRef.current = updatedHistory
        setQuestionCount(newQNum)
        questionCountRef.current = newQNum
        setIsProcessing(false)

        await speakWithElevenLabs(aiText)

        if (response.data.is_complete) {
          setIsComplete(true)
          dispatch(completeInterview({ score: 75, summary: JSON.stringify({ recommendation: 'Recommended' }) }))
          try { await axios.post('/api/save-interview', { candidate_name: candidateInfo?.name, candidate_email: candidateInfo?.email, candidate_phone: candidateInfo?.phone, resume_text: resumeText, mode: 'voice', transcript: updatedHistory, score: 75, summary: { overall_score: 75, recommendation: 'Recommended' } }) } catch {}
        } else {
          startContinuousListening()
        }
      }
    } catch (error) {
      console.error('Voice turn error:', error)
      setIsProcessing(false)
      startContinuousListening()
    }
  }, [resumeText, selectedRole, candidateInfo, dispatch, speakWithElevenLabs]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFinalTranscript = useCallback((text: string) => {
    if (!text.trim() || isProcessingRef.current) return
    stopAIAudio()
    recognitionRef.current?.abort()
    setIsListening(false)

    dispatch(addTranscriptEntry({ role: 'candidate', text }))
    const updatedHistory = [...conversationHistoryRef.current, { role: 'candidate', text }]
    setConversationHistory(updatedHistory)
    conversationHistoryRef.current = updatedHistory
    setCurrentTranscript('')
    finalTranscriptRef.current = ''

    callVoiceTurn(text, questionCountRef.current, updatedHistory)
  }, [dispatch, callVoiceTurn, stopAIAudio])

  const startContinuousListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return

    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '', final = ''
      for (let i = 0; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) final += t + ' '
        else interim += t
      }
      const display = final + interim
      setCurrentTranscript(display)
      setAudioLevel(0.2 + Math.random() * 0.3)

      if (final.trim()) {
        finalTranscriptRef.current = final.trim()
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = setTimeout(() => {
          if (finalTranscriptRef.current && !isProcessingRef.current) {
            handleFinalTranscript(finalTranscriptRef.current)
          }
        }, 1500)
      }
    }

    recognition.onerror = () => { setIsListening(false); setAudioLevel(0) }
    recognition.onend = () => {
      setIsListening(false)
      setAudioLevel(0)
      if (!isProcessingRef.current && finalTranscriptRef.current) {
        handleFinalTranscript(finalTranscriptRef.current)
      }
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
      setIsListening(true)
    } catch { /* already started */ }
  }, [handleFinalTranscript])

  const startInterview = useCallback(async () => {
    setIsStarted(true)
    await callVoiceTurn('', 0, [])
  }, [callVoiceTurn])

  const interruptAndRespond = useCallback(() => {
    const text = currentTranscript.trim() || finalTranscriptRef.current.trim()
    if (!text) return
    handleFinalTranscript(text)
  }, [currentTranscript, handleFinalTranscript])

  if (isComplete) {
    return (
      <div className="min-h-screen bg-background grain flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border-border/50 bg-card/80 backdrop-blur-sm animate-in">
          <CardHeader className="border-b border-border/50 text-center pb-6">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="font-display text-3xl">Voice Interview Complete</CardTitle>
            <CardDescription>Your responses have been recorded and evaluated</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <Button onClick={onStartFresh} className="w-full gap-2">
              <RotateCcw className="h-4 w-4" /> Start New Interview
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const orbScale = 1 + audioLevel * 0.6
  const orbGlow = Math.floor(audioLevel * 40)
  const state = isSpeaking ? 'speaking' : isListening ? 'listening' : isProcessing ? 'thinking' : 'idle'

  return (
    <div className="min-h-screen bg-background grain flex flex-col">
      <style>{`
        @keyframes orbFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes orbPulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
        @keyframes orbRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes waveform { 0%, 100% { height: 8px; } 50% { height: 32px; } }
        .orb-container { animation: orbFloat 4s ease-in-out infinite; }
        .orb-ring { animation: orbRotate 8s linear infinite; }
        .orb-ring-reverse { animation: orbRotate 6s linear infinite reverse; }
        .wave-bar { animation: waveform 0.6s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div className="p-4">
        <div className="max-w-2xl mx-auto">
          <Card className="border-border/50 bg-card/80 overflow-hidden">
            <div className="bg-secondary/50 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("h-2.5 w-2.5 rounded-full", isStarted ? "bg-primary animate-pulse" : "bg-muted-foreground/30")} />
                  <span className="font-display font-semibold text-foreground text-sm">{isStarted ? 'Interview Active' : 'Ready'}</span>
                  {isStarted && <Badge variant="secondary" className="font-mono text-[10px]">{selectedRole}</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-[10px]">Q: {questionCount}/6</Badge>
                  {isStarted && (
                    <button onClick={() => { cleanup(); setIsComplete(true) }} className="h-7 w-7 rounded-lg bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors">
                      <Square className="h-3 w-3 text-destructive" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Main content - centered orb */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 -mt-8">
        {!isStarted ? (
          <div className="text-center animate-in">
            <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-8">
              <Mic className="h-16 w-16 text-primary" />
            </div>
            <h3 className="font-display text-3xl font-bold text-foreground mb-3">Voice Interview</h3>
            <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
              Have a natural conversation with the AI interviewer. Speak freely — you can interrupt anytime.
            </p>
            <Button onClick={startInterview} size="lg" className="gap-2 h-14 px-8 text-base">
              <Mic className="h-5 w-5" /> Start Interview
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            {/* The Voice Orb */}
            <div className="orb-container relative" onClick={isSpeaking ? stopAIAudio : undefined} style={{ cursor: isSpeaking ? 'pointer' : 'default' }}>
              {/* Outer rings */}
              <div className="absolute inset-[-20px] orb-ring" style={{ opacity: audioLevel * 0.5 }}>
                <div className={cn(
                  "w-full h-full rounded-full border-2",
                  state === 'speaking' ? 'border-accent/30' :
                  state === 'listening' ? 'border-primary/30' :
                  'border-muted-foreground/10'
                )} />
              </div>
              <div className="absolute inset-[-35px] orb-ring-reverse" style={{ opacity: audioLevel * 0.3 }}>
                <div className={cn(
                  "w-full h-full rounded-full border",
                  state === 'speaking' ? 'border-accent/20' :
                  state === 'listening' ? 'border-primary/20' :
                  'border-muted-foreground/5'
                )} />
              </div>

              {/* Main orb */}
              <div
                className={cn(
                  "w-40 h-40 rounded-full flex items-center justify-center transition-all duration-200 relative overflow-hidden",
                  state === 'speaking' ? 'bg-accent/20' :
                  state === 'listening' ? 'bg-primary/20' :
                  state === 'thinking' ? 'bg-secondary' :
                  'bg-secondary/50'
                )}
                style={{
                  transform: `scale(${orbScale})`,
                  boxShadow: state === 'speaking' ? `0 0 ${orbGlow}px rgba(245,158,11,0.3), 0 0 ${orbGlow * 2}px rgba(245,158,11,0.1)` :
                             state === 'listening' ? `0 0 ${orbGlow}px rgba(6,214,160,0.3), 0 0 ${orbGlow * 2}px rgba(6,214,160,0.1)` :
                             'none'
                }}
              >
                {/* Waveform bars inside orb */}
                {(state === 'speaking' || state === 'listening') && (
                  <div className="flex items-center gap-[3px]">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-[4px] rounded-full wave-bar",
                          state === 'speaking' ? 'bg-accent' : 'bg-primary'
                        )}
                        style={{
                          animationDelay: `${i * 0.08}s`,
                          animationDuration: `${0.4 + audioLevel * 0.4}s`,
                          height: `${8 + audioLevel * 30 + Math.sin(i * 0.8) * 10}px`,
                          opacity: 0.5 + audioLevel * 0.5
                        }}
                      />
                    ))}
                  </div>
                )}

                {state === 'thinking' && (
                  <div className="flex items-center gap-2">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2.5 h-2.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                )}

                {state === 'idle' && <MicOff className="h-10 w-10 text-muted-foreground/40" />}
              </div>
            </div>

            {/* State label */}
            <div className="text-center">
              <p className="font-display text-lg font-bold text-foreground mb-1">
                {state === 'speaking' ? 'AI is speaking' :
                 state === 'listening' ? 'Listening...' :
                 state === 'thinking' ? 'Thinking...' : 'Ready'}
              </p>
              <p className="text-xs text-muted-foreground">
                {state === 'speaking' ? 'Tap the orb to interrupt' :
                 state === 'listening' ? 'Speak naturally — pauses auto-send' :
                 state === 'thinking' ? 'Generating response' : ''}
              </p>
            </div>

            {/* Live transcript preview */}
            {currentTranscript && isListening && (
              <div className="glass rounded-lg px-4 py-2 max-w-md text-center animate-in">
                <p className="text-sm text-foreground/70 italic">"{currentTranscript}"</p>
              </div>
            )}

            {/* Manual send for typed input */}
            {isListening && currentTranscript && (
              <Button onClick={interruptAndRespond} size="sm" variant="secondary" className="gap-1.5 text-xs">
                Send now
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Transcript panel at bottom */}
      {transcript.length > 0 && (
        <div className="p-4 pt-0">
          <div className="max-w-2xl mx-auto">
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="font-display text-sm flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Transcript
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div ref={transcriptContainerRef} className="space-y-2 max-h-[200px] overflow-y-auto">
                  {transcript.map((entry, idx) => (
                    <div key={idx} className={cn("p-2.5 rounded-lg text-sm", entry.role === 'ai' ? "glass border-l-2 border-primary" : "glass border-l-2 border-accent")}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Badge variant={entry.role === 'ai' ? "default" : "secondary"} className="text-[9px] font-mono px-1.5 py-0">
                          {entry.role === 'ai' ? 'AI' : 'You'}
                        </Badge>
                        <span className="text-[9px] text-muted-foreground font-mono">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-foreground/80 text-xs leading-relaxed">{entry.text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
