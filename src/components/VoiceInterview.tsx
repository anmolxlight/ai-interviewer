import { useState, useEffect, useRef, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '@/store/store'
import { addTranscriptEntry, completeInterview } from '@/store/slices/interviewSlice'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Mic, MicOff, Volume2, Loader2, CheckCircle, Sparkles, Send, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Textarea } from './ui/textarea'

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}
interface SpeechRecognitionResultList { length: number; item(index: number): SpeechRecognitionResult; [index: number]: SpeechRecognitionResult }
interface SpeechRecognitionResult { length: number; item(index: number): SpeechRecognitionAlternative; [index: number]: SpeechRecognitionAlternative; isFinal: boolean }
interface SpeechRecognitionAlternative { transcript: string; confidence: number }
interface SpeechRecognition extends EventTarget { continuous: boolean; interimResults: boolean; lang: string; start(): void; stop(): void; abort(): void; onresult: ((event: SpeechRecognitionEvent) => void) | null; onerror: ((event: Event) => void) | null; onend: (() => void) | null }
declare global { interface Window { SpeechRecognition: new () => SpeechRecognition; webkitSpeechRecognition: new () => SpeechRecognition } }

interface VoiceInterviewProps {
  onStartFresh: () => void
}

export function VoiceInterview({ onStartFresh }: VoiceInterviewProps) {
  const dispatch = useDispatch()
  const { candidateInfo, resumeText, selectedRole } = useSelector((state: RootState) => state.candidate)
  const { transcript } = useSelector((state: RootState) => state.interview)

  const [isConnected, setIsConnected] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [questionCount, setQuestionCount] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const currentTranscriptRef = useRef('')
  const isProcessingRef = useRef(false)

  useEffect(() => { currentTranscriptRef.current = currentTranscript }, [currentTranscript])
  useEffect(() => { isProcessingRef.current = isProcessing }, [isProcessing])

  useEffect(() => {
    return () => {
      wsRef.current?.close()
      recognitionRef.current?.stop()
      window.speechSynthesis?.cancel()
    }
  }, [])

  const speakText = useCallback((text: string) => {
    if (!window.speechSynthesis) return
    setIsSpeaking(true)
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 1
    utterance.onend = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }, [])

  const sendResponse = useCallback(() => {
    const text = currentTranscriptRef.current.trim()
    if (!text || !wsRef.current || isProcessingRef.current) return
    setIsProcessing(true)
    wsRef.current.send(JSON.stringify({ type: 'user_response', text }))
    setCurrentTranscript('')
    setIsProcessing(false)
  }, [])

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return
    try {
      setIsListening(true)
      setCurrentTranscript('')
      recognitionRef.current.start()
    } catch (e) { console.error('Error starting recognition:', e) }
  }, [])

  const stopListening = useCallback(() => {
    setIsListening(false)
    recognitionRef.current?.stop()
  }, [])

  const setupSpeechRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return false
    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '', final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) final += t + ' '
        else interim += t
      }
      const combined = final || interim
      setCurrentTranscript(combined)
      currentTranscriptRef.current = combined
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => {
      setIsListening(false)
      if (currentTranscriptRef.current.trim() && !isProcessingRef.current) {
        sendResponse()
      }
    }
    recognitionRef.current = recognition
    return true
  }, [sendResponse])

  const connectToInterview = useCallback(async () => {
    if (!setupSpeechRecognition()) return
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/ws/voice-interview/${Date.now()}`)
      ws.onopen = () => {
        setIsConnected(true)
        ws.send(JSON.stringify({ type: 'init', data: { candidateName: candidateInfo?.name, resumeText, role: selectedRole } }))
      }
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        if (msg.type === 'transcript_update') {
          dispatch(addTranscriptEntry({ role: msg.role === 'ai' ? 'ai' : 'candidate', text: msg.text }))
          if (msg.role === 'ai') {
            speakText(msg.text)
            if (msg.text.toLowerCase().includes('question')) setQuestionCount(prev => Math.min(prev + 1, 6))
          }
        } else if (msg.type === 'interview_complete') {
          setIsComplete(true)
          dispatch(completeInterview({ score: msg.data?.score || 75, summary: JSON.stringify(msg.data?.summary || {}) }))
          ws.close()
          recognitionRef.current?.stop()
          window.speechSynthesis?.cancel()
        }
      }
      ws.onerror = () => { setIsConnected(false) }
      ws.onclose = () => { setIsConnected(false); setIsListening(false) }
      wsRef.current = ws
    } catch (e) { console.error('Error connecting:', e) }
  }, [candidateInfo, resumeText, selectedRole, dispatch, speakText, setupSpeechRecognition])

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

  return (
    <div className="min-h-screen bg-background grain p-4">
      <div className="max-w-4xl mx-auto py-6 space-y-4">
        <Card className="border-border/50 bg-card/80 overflow-hidden">
          <div className="bg-secondary/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("h-3 w-3 rounded-full", isConnected ? "bg-primary animate-pulse" : "bg-muted-foreground/30")} />
                <span className="font-display font-semibold text-foreground">{isConnected ? 'Connected' : 'Disconnected'}</span>
                {isConnected && <Badge variant="secondary" className="font-mono text-xs">{selectedRole}</Badge>}
              </div>
              <Badge variant="secondary" className="font-mono text-xs">Q: {questionCount}/6</Badge>
            </div>
          </div>
        </Card>

        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Mic className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display text-xl">Voice Interview</CardTitle>
                <CardDescription className="text-xs">Speak naturally with the AI interviewer</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {!isConnected ? (
              <div className="text-center py-12">
                <div className="h-24 w-24 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Mic className="h-12 w-12 text-primary" />
                </div>
                <h3 className="font-display text-2xl font-bold text-foreground mb-3">Ready to Start?</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  Ensure your microphone is working and permissions are granted.
                </p>
                <Button onClick={connectToInterview} size="lg" className="gap-2">
                  <Mic className="h-5 w-5" /> Start Voice Interview
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center gap-6 py-8 glass rounded-xl">
                  <div className={cn(
                    "h-32 w-32 rounded-2xl flex items-center justify-center transition-all duration-300",
                    isSpeaking ? "bg-accent/20 animate-pulse" :
                    isListening ? "bg-primary/20 animate-pulse" :
                    "bg-secondary"
                  )}>
                    {isSpeaking ? <Volume2 className="h-16 w-16 text-accent" /> :
                     isListening ? <Mic className="h-16 w-16 text-primary" /> :
                     <MicOff className="h-16 w-16 text-muted-foreground" />}
                  </div>
                  <div className="text-center">
                    <p className="font-display text-xl font-bold text-foreground mb-1">
                      {isSpeaking ? 'AI Speaking...' : isListening ? 'Listening...' : 'Ready'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isSpeaking ? 'Wait for the AI to finish' : isListening ? 'Speak your answer clearly' : 'Click mic to respond'}
                    </p>
                  </div>
                </div>
                {!isSpeaking && (
                  <div className="space-y-4">
                    <Textarea
                      value={currentTranscript}
                      onChange={(e) => { setCurrentTranscript(e.target.value); currentTranscriptRef.current = e.target.value }}
                      placeholder={isListening ? "Listening..." : "Click mic to speak or type here..."}
                      className="min-h-[100px] bg-secondary/30 border-border/50"
                      disabled={isListening}
                    />
                    <div className="flex justify-between items-center gap-4">
                      <Button
                        variant={isListening ? "destructive" : "secondary"}
                        onClick={isListening ? stopListening : startListening}
                        disabled={isSpeaking}
                        className="gap-2"
                      >
                        {isListening ? <><MicOff className="h-4 w-4" /> Stop</> : <><Mic className="h-4 w-4" /> Speak</>}
                      </Button>
                      <Button
                        onClick={sendResponse}
                        disabled={!currentTranscript.trim() || isProcessing || isListening}
                        className="gap-2"
                      >
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Send
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {transcript.length > 0 && (
          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Transcript
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {transcript.map((entry, idx) => (
                  <div key={idx} className={cn("p-3 rounded-lg", entry.role === 'ai' ? "glass border-l-2 border-primary" : "glass border-l-2 border-accent")}>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={entry.role === 'ai' ? "default" : "secondary"} className="text-xs font-mono">
                        {entry.role === 'ai' ? 'AI' : 'You'}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80">{entry.text}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
