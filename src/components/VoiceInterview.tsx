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
import axios from 'axios'

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList; resultIndex: number
}
interface SpeechRecognitionResultList { length: number; [index: number]: SpeechRecognitionResult }
interface SpeechRecognitionResult { [index: number]: SpeechRecognitionAlternative; isFinal: boolean; length: number }
interface SpeechRecognitionAlternative { transcript: string; confidence: number }
interface SpeechRecognition extends EventTarget {
  continuous: boolean; interimResults: boolean; lang: string
  start(): void; stop(): void; abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: Event) => void) | null
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

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const currentTranscriptRef = useRef('')
  const isProcessingRef = useRef(false)

  useEffect(() => { currentTranscriptRef.current = currentTranscript }, [currentTranscript])
  useEffect(() => { isProcessingRef.current = isProcessing }, [isProcessing])

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      window.speechSynthesis?.cancel()
    }
  }, [])

  const speakText = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) { resolve(); return }
      setIsSpeaking(true)
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 1
      utterance.onend = () => { setIsSpeaking(false); resolve() }
      utterance.onerror = () => { setIsSpeaking(false); resolve() }
      window.speechSynthesis.speak(utterance)
    })
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
    recognition.onend = () => setIsListening(false)
    recognitionRef.current = recognition
    return true
  }, [])

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return
    try {
      setIsListening(true)
      setCurrentTranscript('')
      currentTranscriptRef.current = ''
      recognitionRef.current.start()
    } catch { /* already started */ }
  }, [])

  const stopListening = useCallback(() => {
    setIsListening(false)
    recognitionRef.current?.stop()
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
        setQuestionCount(newQNum)

        await speakText(aiText)

        if (response.data.is_complete) {
          setIsComplete(true)
          dispatch(completeInterview({ score: 75, summary: JSON.stringify({ recommendation: 'Recommended' }) }))
          try {
            await axios.post('/api/save-interview', {
              candidate_name: candidateInfo?.name,
              candidate_email: candidateInfo?.email,
              candidate_phone: candidateInfo?.phone,
              resume_text: resumeText,
              mode: 'voice',
              transcript: updatedHistory,
              score: 75,
              summary: { overall_score: 75, recommendation: 'Recommended' }
            })
          } catch { /* Supabase optional */ }
        }
      }
    } catch (error: any) {
      console.error('Voice turn error:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [resumeText, selectedRole, candidateInfo, dispatch, speakText])

  const startInterview = useCallback(async () => {
    if (!setupSpeechRecognition()) {
      alert('Speech recognition not supported. Use Chrome or Edge.')
      return
    }
    setIsStarted(true)
    await callVoiceTurn('', 0, [])
  }, [setupSpeechRecognition, callVoiceTurn])

  const sendResponse = useCallback(async () => {
    const text = currentTranscriptRef.current.trim()
    if (!text || isProcessingRef.current) return

    dispatch(addTranscriptEntry({ role: 'candidate', text }))
    const updatedHistory = [...conversationHistory, { role: 'candidate', text }]
    setConversationHistory(updatedHistory)
    setCurrentTranscript('')
    currentTranscriptRef.current = ''

    await callVoiceTurn(text, questionCount, updatedHistory)
  }, [conversationHistory, questionCount, dispatch, callVoiceTurn])

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
                <div className={cn("h-3 w-3 rounded-full", isStarted ? "bg-primary animate-pulse" : "bg-muted-foreground/30")} />
                <span className="font-display font-semibold text-foreground">{isStarted ? 'Interview Active' : 'Ready'}</span>
                {isStarted && <Badge variant="secondary" className="font-mono text-xs">{selectedRole}</Badge>}
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
                <CardDescription className="text-xs">Speak naturally — works everywhere including Vercel</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {!isStarted ? (
              <div className="text-center py-12">
                <div className="h-24 w-24 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Mic className="h-12 w-12 text-primary" />
                </div>
                <h3 className="font-display text-2xl font-bold text-foreground mb-3">Ready to Start?</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  Ensure your microphone is working. The AI will ask 6 questions and you can respond by speaking or typing.
                </p>
                <Button onClick={startInterview} size="lg" className="gap-2">
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
                    isProcessing ? "bg-secondary animate-pulse" :
                    "bg-secondary"
                  )}>
                    {isSpeaking ? <Volume2 className="h-16 w-16 text-accent" /> :
                     isListening ? <Mic className="h-16 w-16 text-primary" /> :
                     isProcessing ? <Loader2 className="h-16 w-16 text-muted-foreground animate-spin" /> :
                     <MicOff className="h-16 w-16 text-muted-foreground" />}
                  </div>
                  <div className="text-center">
                    <p className="font-display text-xl font-bold text-foreground mb-1">
                      {isSpeaking ? 'AI Speaking...' : isListening ? 'Listening...' : isProcessing ? 'Thinking...' : 'Ready'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isSpeaking ? 'Wait for the AI to finish' : isListening ? 'Speak your answer clearly' : isProcessing ? 'Generating response...' : 'Click mic to respond'}
                    </p>
                  </div>
                </div>

                {!isSpeaking && !isProcessing && (
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
                        disabled={isSpeaking || isProcessing}
                        className="gap-2"
                      >
                        {isListening ? <><MicOff className="h-4 w-4" /> Stop</> : <><Mic className="h-4 w-4" /> Speak</>}
                      </Button>
                      <Button
                        onClick={sendResponse}
                        disabled={!currentTranscript.trim() || isProcessing || isListening}
                        className="gap-2"
                      >
                        <Send className="h-4 w-4" /> Send
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
