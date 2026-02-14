import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '@/store/store'
import { addTranscriptEntry, completeInterview } from '@/store/slices/interviewSlice'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Monitor, Mic, MicOff, MonitorOff, Loader2, CheckCircle, Sparkles, Video, VideoOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LiveInterview() {
  const dispatch = useDispatch()
  const { candidateInfo, resumeText, selectedRole } = useSelector((state: RootState) => state.candidate)
  const { transcript } = useSelector((state: RootState) => state.interview)
  
  const [isConnected, setIsConnected] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isMicActive, setIsMicActive] = useState(false)
  const [isAISpeaking, setIsAISpeaking] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected')
  const [currentQuestion, setCurrentQuestion] = useState<string>('')
  
  const wsRef = useRef<WebSocket | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null)

  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [])

  const cleanup = () => {
    if (wsRef.current) {
      wsRef.current.close()
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop())
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop())
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }
  }

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 5 }
        },
        audio: false
      })
      
      screenStreamRef.current = screenStream
      
      if (videoRef.current) {
        videoRef.current.srcObject = screenStream
      }
      
      setIsScreenSharing(true)
      
      // Handle screen share stop
      screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        setIsScreenSharing(false)
        if (wsRef.current) {
          wsRef.current.send(JSON.stringify({ type: 'screen_stopped' }))
        }
      })
      
      return screenStream
    } catch (error) {
      console.error('Error starting screen share:', error)
      alert('Could not start screen sharing. Please allow screen sharing permissions.')
      throw error
    }
  }

  const startMicrophone = async () => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      })
      
      audioStreamRef.current = audioStream
      setIsMicActive(true)
      
      return audioStream
    } catch (error) {
      console.error('Error starting microphone:', error)
      alert('Could not access microphone. Please allow microphone permissions.')
      throw error
    }
  }

  const setupAudioStreaming = (audioStream: MediaStream) => {
    const audioContext = new AudioContext({ sampleRate: 16000 })
    audioContextRef.current = audioContext
    
    const source = audioContext.createMediaStreamSource(audioStream)
    const processor = audioContext.createScriptProcessor(4096, 1, 1)
    audioProcessorRef.current = processor
    
    processor.onaudioprocess = (e) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
      
      const inputData = e.inputBuffer.getChannelData(0)
      const pcmData = new Int16Array(inputData.length)
      
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]))
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
      }
      
      // Convert to base64 and send
      const base64Audio = arrayBufferToBase64(pcmData.buffer)
      
      wsRef.current.send(JSON.stringify({
        type: 'audio_chunk',
        data: base64Audio
      }))
    }
    
    source.connect(processor)
    processor.connect(audioContext.destination)
  }

  const setupVideoStreaming = (screenStream: MediaStream) => {
    const videoTrack = screenStream.getVideoTracks()[0]
    const imageCapture = new (window as any).ImageCapture(videoTrack)
    
    // Capture frames at 1 FPS (Gemini Live API limitation)
    const captureInterval = setInterval(async () => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !isScreenSharing) {
        clearInterval(captureInterval)
        return
      }
      
      try {
        const blob = await imageCapture.takePhoto()
        const base64Image = await blobToBase64(blob)
        
        wsRef.current.send(JSON.stringify({
          type: 'video_frame',
          data: base64Image.split(',')[1] // Remove data:image/jpeg;base64, prefix
        }))
      } catch (error) {
        console.error('Error capturing frame:', error)
      }
    }, 1000) // 1 FPS
    
    return captureInterval
  }

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  const startLiveInterview = async () => {
    try {
      setConnectionStatus('connecting')
      
      // Start screen share first
      const screenStream = await startScreenShare()
      
      // Start microphone
      const audioStream = await startMicrophone()
      
      // Setup WebSocket connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/api/ws/live-interview/${Date.now()}`
      const ws = new WebSocket(wsUrl)
      
      ws.onopen = () => {
        console.log('WebSocket connected to Live API')
        setIsConnected(true)
        setConnectionStatus('connected')
        
        // Send initial context
        ws.send(JSON.stringify({
          type: 'init',
          data: {
            candidateName: candidateInfo?.name,
            resumeText: resumeText,
            role: selectedRole
          }
        }))
        
        // Setup audio streaming
        setupAudioStreaming(audioStream)
        
        // Setup video frame capture
        setupVideoStreaming(screenStream)
      }
      
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data)
        handleWebSocketMessage(message)
      }
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionStatus('error')
        alert('Connection error. Please refresh and try again.')
      }
      
      ws.onclose = () => {
        setIsConnected(false)
        setConnectionStatus('disconnected')
      }
      
      wsRef.current = ws
      
    } catch (error) {
      console.error('Error starting live interview:', error)
      setConnectionStatus('error')
    }
  }

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'ai_speech':
        // AI is speaking
        setIsAISpeaking(true)
        
        // Add to transcript
        dispatch(addTranscriptEntry({
          role: 'ai',
          text: message.text || 'AI is speaking...'
        }))
        
        // Play audio if provided
        if (message.audio_data) {
          playAudioResponse(message.audio_data)
        }
        
        if (message.text) {
          setCurrentQuestion(message.text)
        }
        break
        
      case 'ai_speech_end':
        setIsAISpeaking(false)
        break
        
      case 'transcript':
        // Real-time transcription of user speech
        dispatch(addTranscriptEntry({
          role: 'candidate',
          text: message.text
        }))
        break
        
      case 'evaluation':
        // Real-time evaluation feedback
        dispatch(addTranscriptEntry({
          role: 'ai',
          text: `Evaluation: ${message.feedback}`
        }))
        break
        
      case 'interview_complete':
        handleInterviewComplete(message.data)
        break
        
      default:
        console.log('Unknown message type:', message.type)
        break
    }
  }

  const playAudioResponse = async (base64Audio: string) => {
    try {
      // Decode base64 to binary
      const audioData = atob(base64Audio)
      const arrayBuffer = new ArrayBuffer(audioData.length)
      const view = new Uint8Array(arrayBuffer)
      
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i)
      }
      
      // Gemini Live API returns PCM audio at 24kHz, 16-bit, mono
      const audioContext = new AudioContext({ sampleRate: 24000 })
      
      // Convert Int16 PCM to Float32 for Web Audio API
      const int16Array = new Int16Array(arrayBuffer)
      const float32Array = new Float32Array(int16Array.length)
      
      for (let i = 0; i < int16Array.length; i++) {
        // Convert from 16-bit PCM to float -1.0 to 1.0
        float32Array[i] = int16Array[i] / 32768.0
      }
      
      // Create audio buffer
      const audioBuffer = audioContext.createBuffer(1, float32Array.length, 24000)
      audioBuffer.copyToChannel(float32Array, 0)
      
      // Play the audio
      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContext.destination)
      source.start(0)
      
      source.onended = () => {
        setIsAISpeaking(false)
      }
    } catch (error) {
      console.error('Error playing audio:', error)
      setIsAISpeaking(false)
    }
  }

  const handleInterviewComplete = (data: any) => {
    setIsComplete(true)
    dispatch(completeInterview({
      score: data.score || 75,
      summary: JSON.stringify(data.summary || {})
    }))
    
    cleanup()
  }

  const stopInterview = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'end_interview' }))
    }
    cleanup()
    setIsConnected(false)
    setIsScreenSharing(false)
    setIsMicActive(false)
  }

  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100 p-4">
        <Card className="w-full max-w-2xl shadow-2xl border-0">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-8 text-center">
            <CheckCircle className="h-20 w-20 text-white mx-auto mb-4" />
            <CardTitle className="text-4xl font-bold text-white mb-2">Live Interview Complete!</CardTitle>
            <CardDescription className="text-emerald-100 text-lg">
              Thank you for completing the live coding interview
            </CardDescription>
          </div>
          <CardContent className="p-8 space-y-6">
            <div className="text-center py-8 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl">
              <Sparkles className="h-16 w-16 text-emerald-600 mx-auto mb-4" />
              <p className="text-xl font-semibold text-gray-800 mb-2">
                Your screen and responses have been recorded and evaluated
              </p>
              <p className="text-gray-600">
                The AI interviewer has completed real-time analysis of your problem-solving approach
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-100 p-4">
      <div className="max-w-7xl mx-auto py-8">
        {/* Status Card */}
        <Card className="mb-6 border-0 shadow-lg">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "h-4 w-4 rounded-full",
                  isConnected ? "bg-green-400 animate-pulse" : "bg-gray-300"
                )} />
                <span className="font-semibold text-lg">
                  {connectionStatus === 'connecting' ? 'Connecting...' :
                   connectionStatus === 'connected' ? 'Live Interview Active' :
                   connectionStatus === 'error' ? 'Connection Error' :
                   'Ready to Start'}
                </span>
                {isConnected && (
                  <>
                    <Badge variant="secondary" className="bg-white/20 border-0 flex items-center gap-1">
                      {isScreenSharing ? <Monitor className="h-3 w-3" /> : <MonitorOff className="h-3 w-3" />}
                      Screen
                    </Badge>
                    <Badge variant="secondary" className="bg-white/20 border-0 flex items-center gap-1">
                      {isMicActive ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
                      Audio
                    </Badge>
                  </>
                )}
              </div>
              <Badge variant="secondary" className="bg-white/20 border-0">
                {selectedRole}
              </Badge>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Video Preview */}
          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-indigo-600" />
                  Your Screen Preview
                </CardTitle>
                <CardDescription>
                  AI can see your screen in real-time to evaluate your coding approach
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    className="w-full h-full object-contain"
                  />
                  {!isScreenSharing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                      <div className="text-center text-gray-400">
                        <MonitorOff className="h-16 w-16 mx-auto mb-4" />
                        <p>Screen sharing not active</p>
                      </div>
                    </div>
                  )}
                  {isAISpeaking && (
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-red-500 animate-pulse">
                        AI Speaking...
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Controls */}
            {!isConnected ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-8 text-center">
                  <div className="mb-6">
                    <div className="h-24 w-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto shadow-xl">
                      <Video className="h-12 w-12 text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">Ready for Live Interview?</h3>
                  <p className="text-gray-600 mb-6">
                    This interview will use screen sharing and voice. The AI will see your screen as you solve problems and provide real-time feedback.
                  </p>
                  <ul className="text-left text-sm text-gray-600 mb-6 space-y-2 max-w-md mx-auto">
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>Share your screen (IDE, browser, or coding environment)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>Enable microphone for voice responses</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>AI will watch you code and provide real-time evaluation</span>
                    </li>
                  </ul>
                  <Button 
                    size="lg" 
                    onClick={startLiveInterview}
                    disabled={connectionStatus === 'connecting'}
                    className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg px-8 h-14 text-lg"
                  >
                    {connectionStatus === 'connecting' ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Video className="h-6 w-6" />
                        Start Live Interview
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <Button 
                    variant="destructive"
                    size="lg" 
                    onClick={stopInterview}
                    className="w-full gap-2"
                  >
                    <VideoOff className="h-5 w-5" />
                    End Interview
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Conversation & Status */}
          <div className="space-y-6">
            {/* Current Question */}
            {currentQuestion && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    Current Question
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-lg text-gray-800">{currentQuestion}</p>
                </CardContent>
              </Card>
            )}

            {/* Status Indicator */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <div className="flex flex-col items-center gap-6">
                  <div className="relative">
                    <div className={cn(
                      "h-32 w-32 rounded-full bg-gradient-to-br flex items-center justify-center shadow-2xl",
                      isAISpeaking ? "from-orange-400 to-red-500 animate-pulse" :
                      isMicActive ? "from-indigo-500 to-purple-600 animate-pulse" :
                      "from-gray-300 to-gray-400"
                    )}>
                      {isAISpeaking ? (
                        <Sparkles className="h-16 w-16 text-white animate-pulse" />
                      ) : isMicActive ? (
                        <Mic className="h-16 w-16 text-white" />
                      ) : (
                        <MicOff className="h-16 w-16 text-white" />
                      )}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-800 mb-2">
                      {isAISpeaking ? '🤖 AI Interviewer Speaking' : 
                       isMicActive ? '🎤 You can speak now' : 
                       '⏸ Waiting...'}
                    </p>
                    <p className="text-gray-600">
                      {isAISpeaking ? 'Listening to the question...' :
                       isMicActive ? 'The AI is watching your screen' :
                       'Start the interview to begin'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Live Transcript */}
            {transcript.length > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-indigo-600" />
                    Live Transcript
                  </CardTitle>
                  <CardDescription>Real-time conversation with AI</CardDescription>
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
                            {entry.role === 'ai' ? '🤖 AI' : '👤 You'}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-gray-800 text-sm">{entry.text}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

