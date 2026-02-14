import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '@/store/store'
import { addTranscriptEntry, completeInterview } from '@/store/slices/interviewSlice'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Mic, MicOff, Volume2, Loader2, CheckCircle, Sparkles, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Textarea } from './ui/textarea'

// Add Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

export function VoiceInterview() {
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
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const speakText = (text: string) => {
    if (!window.speechSynthesis) return
    
    setIsSpeaking(true)
    window.speechSynthesis.cancel() // Cancel any ongoing speech
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 1
    
    utterance.onend = () => {
      setIsSpeaking(false)
      // Automatically start listening after AI finishes speaking
      if (isConnected && questionCount < 6) {
        setTimeout(() => startListening(), 500)
      }
    }
    
    synthRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }

  const startListening = () => {
    if (!recognitionRef.current) return
    
    try {
      setIsListening(true)
      setCurrentTranscript('')
      recognitionRef.current.start()
    } catch (e) {
      console.error('Error starting recognition:', e)
    }
  }

  const stopListening = () => {
    if (!recognitionRef.current) return
    
    setIsListening(false)
    recognitionRef.current.stop()
  }

  const setupSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.')
      return false
    }
    
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = ''
      let finalTranscript = ''
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }
      
      setCurrentTranscript(finalTranscript || interimTranscript)
    }
    
    recognition.onerror = (event: Event) => {
      console.error('Speech recognition error:', event)
      setIsListening(false)
    }
    
    recognition.onend = () => {
      setIsListening(false)
      // If we have a transcript and haven't sent it yet, automatically send it
      if (currentTranscript.trim() && !isProcessing) {
        handleSendResponse()
      }
    }
    
    recognitionRef.current = recognition
    return true
  }

  const connectToInterview = async () => {
    // Setup speech recognition
    if (!setupSpeechRecognition()) {
      return
    }
    
    try {
      // Setup WebSocket connection
      // Use WebSocket on the same host as the frontend (proxy will handle it)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/api/ws/voice-interview/${Date.now()}`
      const ws = new WebSocket(wsUrl)
      
      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        
        // Send initial context
        ws.send(JSON.stringify({
          type: 'init',
          data: {
            candidateName: candidateInfo?.name,
            resumeText: resumeText,
            role: selectedRole
          }
        }))
      }
      
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data)
        handleWebSocketMessage(message)
      }
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        alert('Connection error. Please refresh and try again.')
      }
      
      ws.onclose = () => {
        setIsConnected(false)
        setIsListening(false)
      }
      
      wsRef.current = ws
    } catch (error) {
      console.error('Error connecting:', error)
      alert('Could not connect to server. Please try again.')
    }
  }

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'transcript_update':
        // Add to transcript
        dispatch(addTranscriptEntry({
          role: message.role === 'ai' ? 'ai' : 'candidate',
          text: message.text
        }))
        
        // If AI is speaking, use text-to-speech
        if (message.role === 'ai') {
          speakText(message.text)
          if (message.text.toLowerCase().includes('question')) {
            setQuestionCount(prev => Math.min(prev + 1, 6))
          }
        }
        break
        
      case 'interview_complete':
        handleInterviewComplete(message.data)
        break
        
      default:
        break
    }
  }

  const handleSendResponse = () => {
    if (!currentTranscript.trim() || !wsRef.current || isProcessing) return
    
    setIsProcessing(true)
    
    // Send user response to backend
    wsRef.current.send(JSON.stringify({
      type: 'user_response',
      text: currentTranscript.trim()
    }))
    
    // Clear current transcript
    setCurrentTranscript('')
    setIsProcessing(false)
  }

  const handleInterviewComplete = (data: any) => {
    setIsComplete(true)
    dispatch(completeInterview({
      score: data.score || 75,
      summary: JSON.stringify(data.summary || {})
    }))
    
    if (wsRef.current) {
      wsRef.current.close()
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  }

  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100 p-4">
        <Card className="w-full max-w-2xl shadow-2xl border-0">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-8 text-center">
            <CheckCircle className="h-20 w-20 text-white mx-auto mb-4" />
            <CardTitle className="text-4xl font-bold text-white mb-2">Voice Interview Complete!</CardTitle>
            <CardDescription className="text-emerald-100 text-lg">
              Thank you for completing the voice interview
            </CardDescription>
          </div>
          <CardContent className="p-8 space-y-6">
            <div className="text-center py-8 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl">
              <Sparkles className="h-16 w-16 text-emerald-600 mx-auto mb-4" />
              <p className="text-xl font-semibold text-gray-800 mb-2">
                Your interview has been recorded and evaluated
              </p>
              <p className="text-gray-600">
                The interviewer will review your responses and provide feedback shortly
              </p>
            </div>
            <Button 
              className="w-full h-12 text-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg" 
              onClick={() => window.location.reload()}
            >
              Start New Interview
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-100 p-4">
      <div className="max-w-5xl mx-auto py-8">
        {/* Status Card */}
        <Card className="mb-6 border-0 shadow-lg">
          <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-4">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "h-4 w-4 rounded-full",
                  isConnected ? "bg-green-400 animate-pulse" : "bg-gray-300"
                )} />
                <span className="font-semibold text-lg">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
                {isConnected && (
                  <Badge variant="secondary" className="bg-white/20 border-0">
                    {selectedRole}
                  </Badge>
                )}
              </div>
              <Badge variant="secondary" className="bg-white/20 border-0">
                Question: {questionCount} / 6
              </Badge>
            </div>
          </div>
        </Card>

        {/* Main Interview Card */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                <Mic className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">Voice Interview</CardTitle>
                <CardDescription className="text-base">
                  Speak naturally with the AI interviewer. Your conversation will be transcribed in real-time.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-8 space-y-6">
            {!isConnected ? (
              <div className="text-center py-16">
                <div className="mb-8">
                  <div className="h-32 w-32 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mx-auto shadow-2xl">
                    <Mic className="h-16 w-16 text-white" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-gray-800 mb-4">Ready to Start?</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Click the button below to begin your voice interview. Make sure your microphone is working and permissions are granted.
                </p>
                <Button 
                  size="lg" 
                  onClick={connectToInterview} 
                  className="gap-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 shadow-lg px-8 h-14 text-lg"
                >
                  <Mic className="h-6 w-6" />
                  Start Voice Interview
                </Button>
              </div>
            ) : (
              <>
                {/* Visual Feedback */}
                <div className="flex flex-col items-center gap-8 py-8 bg-gradient-to-br from-white to-gray-50 rounded-2xl">
                  <div className="relative">
                    <div className={cn(
                      "h-40 w-40 rounded-full bg-gradient-to-br flex items-center justify-center shadow-2xl",
                      isSpeaking ? "from-orange-400 to-red-500 animate-pulse" :
                      isListening ? "from-purple-500 to-pink-600 animate-pulse" :
                      "from-gray-300 to-gray-400"
                    )}>
                      {isSpeaking ? (
                        <Volume2 className="h-20 w-20 text-white" />
                      ) : isListening ? (
                        <Mic className="h-20 w-20 text-white animate-pulse" />
                      ) : (
                        <MicOff className="h-20 w-20 text-white" />
                      )}
                    </div>
                    {isListening && (
                      <div className="absolute -top-4 -right-4">
                        <div className="h-8 w-8 bg-red-500 rounded-full animate-pulse flex items-center justify-center">
                          <div className="h-3 w-3 bg-white rounded-full"></div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-center max-w-md">
                    <p className="text-2xl font-bold text-gray-800 mb-2">
                      {isSpeaking ? '🔊 AI is speaking...' : 
                       isListening ? '🎤 Listening to you...' : 
                       '⏸ Ready for your response'}
                    </p>
                    <p className="text-gray-600">
                      {isSpeaking ? 'Please wait for the AI to finish' :
                       isListening ? 'Speak your answer clearly' :
                       'Click the microphone button to respond'}
                    </p>
                  </div>
                </div>

                {/* Current Transcript Input */}
                {!isSpeaking && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-700">Your Response:</h4>
                    <Textarea
                      value={currentTranscript}
                      onChange={(e) => setCurrentTranscript(e.target.value)}
                      placeholder={isListening ? "Listening... speak now!" : "Click mic to speak or type here..."}
                      className="min-h-[120px] text-base"
                      disabled={isListening}
                    />
                    
                    {/* Controls */}
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex gap-3">
                        <Button
                          variant={isListening ? "destructive" : "default"}
                          size="lg"
                          onClick={isListening ? stopListening : startListening}
                          disabled={isSpeaking}
                          className="gap-2"
                        >
                          {isListening ? (
                            <>
                              <MicOff className="h-5 w-5" />
                              Stop Listening
                            </>
                          ) : (
                            <>
                              <Mic className="h-5 w-5" />
                              Start Speaking
                            </>
                          )}
                        </Button>
                      </div>
                      
                      <Button
                        onClick={handleSendResponse}
                        disabled={!currentTranscript.trim() || isProcessing || isListening}
                        size="lg"
                        className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-5 w-5" />
                            Send Response
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Transcript Card */}
        {transcript.length > 0 && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Live Transcript
              </CardTitle>
              <CardDescription>Real-time conversation history</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {transcript.map((entry, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "p-4 rounded-xl",
                      entry.role === 'ai' ? "bg-blue-50 border-l-4 border-blue-500" : "bg-green-50 border-l-4 border-green-500"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={entry.role === 'ai' ? "default" : "secondary"}>
                        {entry.role === 'ai' ? '🤖 AI Interviewer' : '👤 You'}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-gray-800">{entry.text}</p>
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
