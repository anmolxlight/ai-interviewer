import { useState, useEffect, useRef, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '@/store/store'
import { addTranscriptEntry, completeInterview } from '@/store/slices/interviewSlice'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Monitor, Mic, MicOff, MonitorOff, Loader2, CheckCircle, Sparkles, Video, VideoOff, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LiveInterviewProps {
  onStartFresh: () => void
}

export function LiveInterview({ onStartFresh }: LiveInterviewProps) {
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
  const captureIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isScreenSharingRef = useRef(false)

  useEffect(() => { isScreenSharingRef.current = isScreenSharing }, [isScreenSharing])
  useEffect(() => { return () => { cleanup() } }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const cleanup = useCallback(() => {
    if (captureIntervalRef.current) clearInterval(captureIntervalRef.current)
    wsRef.current?.close()
    screenStreamRef.current?.getTracks().forEach(track => track.stop())
    audioStreamRef.current?.getTracks().forEach(track => track.stop())
    audioContextRef.current?.close().catch(() => {})
  }, [])

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
    return btoa(binary)
  }

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })

  const playAudioResponse = useCallback(async (base64Audio: string) => {
    try {
      const audioData = atob(base64Audio)
      const arrayBuffer = new ArrayBuffer(audioData.length)
      const view = new Uint8Array(arrayBuffer)
      for (let i = 0; i < audioData.length; i++) view[i] = audioData.charCodeAt(i)

      const audioContext = new AudioContext({ sampleRate: 24000 })
      const int16Array = new Int16Array(arrayBuffer)
      const float32Array = new Float32Array(int16Array.length)
      for (let i = 0; i < int16Array.length; i++) float32Array[i] = int16Array[i] / 32768.0

      const audioBuffer = audioContext.createBuffer(1, float32Array.length, 24000)
      audioBuffer.copyToChannel(float32Array, 0)
      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContext.destination)
      source.start(0)
      source.onended = () => {
        setIsAISpeaking(false)
        audioContext.close().catch(() => {})
      }
    } catch (error) {
      console.error('Error playing audio:', error)
      setIsAISpeaking(false)
    }
  }, [])

  const handleWebSocketMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'ai_speech':
        setIsAISpeaking(true)
        dispatch(addTranscriptEntry({ role: 'ai', text: message.text || 'AI is speaking...' }))
        if (message.audio_data) playAudioResponse(message.audio_data)
        if (message.text) setCurrentQuestion(message.text)
        break
      case 'ai_speech_end':
        setIsAISpeaking(false)
        break
      case 'transcript':
        dispatch(addTranscriptEntry({ role: 'candidate', text: message.text }))
        break
      case 'evaluation':
        dispatch(addTranscriptEntry({ role: 'ai', text: `Evaluation: ${message.feedback}` }))
        break
      case 'interview_complete':
        setIsComplete(true)
        dispatch(completeInterview({ score: message.data?.score || 75, summary: JSON.stringify(message.data?.summary || {}) }))
        cleanup()
        break
      case 'ping':
        break
      default:
        break
    }
  }, [dispatch, playAudioResponse, cleanup])

  const startLiveInterview = useCallback(async () => {
    try {
      setConnectionStatus('connecting')

      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 5 } },
        audio: false
      })
      screenStreamRef.current = screenStream
      if (videoRef.current) videoRef.current.srcObject = screenStream
      setIsScreenSharing(true)
      screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        setIsScreenSharing(false)
        wsRef.current?.send(JSON.stringify({ type: 'screen_stopped' }))
      })

      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 }
      })
      audioStreamRef.current = audioStream
      setIsMicActive(true)

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/ws/live-interview/${Date.now()}`)

      ws.onopen = () => {
        setIsConnected(true)
        setConnectionStatus('connected')
        ws.send(JSON.stringify({ type: 'init', data: { candidateName: candidateInfo?.name, resumeText, role: selectedRole } }))

        const audioContext = new AudioContext({ sampleRate: 16000 })
        audioContextRef.current = audioContext
        const source = audioContext.createMediaStreamSource(audioStream)
        const processor = audioContext.createScriptProcessor(4096, 1, 1)
        processor.onaudioprocess = (e) => {
          if (!ws || ws.readyState !== WebSocket.OPEN) return
          const inputData = e.inputBuffer.getChannelData(0)
          const pcmData = new Int16Array(inputData.length)
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]))
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
          }
          ws.send(JSON.stringify({ type: 'audio_chunk', data: arrayBufferToBase64(pcmData.buffer) }))
        }
        source.connect(processor)
        processor.connect(audioContext.destination)

        const videoTrack = screenStream.getVideoTracks()[0]
        const imageCapture = new (window as any).ImageCapture(videoTrack)
        captureIntervalRef.current = setInterval(async () => {
          if (!ws || ws.readyState !== WebSocket.OPEN || !isScreenSharingRef.current) {
            if (captureIntervalRef.current) clearInterval(captureIntervalRef.current)
            return
          }
          try {
            const blob = await imageCapture.takePhoto()
            const base64Image = await blobToBase64(blob)
            ws.send(JSON.stringify({ type: 'video_frame', data: base64Image.split(',')[1] }))
          } catch { /* frame capture may fail occasionally */ }
        }, 1000)
      }

      ws.onmessage = (event) => handleWebSocketMessage(JSON.parse(event.data))
      ws.onerror = () => setConnectionStatus('error')
      ws.onclose = () => { setIsConnected(false); setConnectionStatus('disconnected') }
      wsRef.current = ws
    } catch (error) {
      console.error('Error starting live interview:', error)
      setConnectionStatus('error')
    }
  }, [candidateInfo, resumeText, selectedRole, handleWebSocketMessage, cleanup])

  const stopInterview = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end_interview' }))
      setTimeout(() => cleanup(), 500)
    } else {
      cleanup()
    }
    setIsConnected(false)
    setIsScreenSharing(false)
    setIsMicActive(false)
  }, [cleanup])

  if (isComplete) {
    return (
      <div className="min-h-screen bg-background grain flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border-border/50 bg-card/80 backdrop-blur-sm animate-in">
          <CardHeader className="border-b border-border/50 text-center pb-6">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="font-display text-3xl">Live Interview Complete</CardTitle>
            <CardDescription>Your screen and responses have been evaluated</CardDescription>
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
      <div className="max-w-7xl mx-auto py-6 space-y-4">
        <Card className="border-border/50 bg-card/80 overflow-hidden">
          <div className="bg-secondary/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("h-3 w-3 rounded-full", isConnected ? "bg-primary animate-pulse" : "bg-muted-foreground/30")} />
                <span className="font-display font-semibold text-foreground">
                  {connectionStatus === 'connecting' ? 'Connecting...' :
                   connectionStatus === 'connected' ? 'Live Interview Active' :
                   connectionStatus === 'error' ? 'Connection Error' : 'Ready to Start'}
                </span>
                {isConnected && (
                  <>
                    <Badge variant="secondary" className="font-mono text-xs flex items-center gap-1">
                      {isScreenSharing ? <Monitor className="h-3 w-3" /> : <MonitorOff className="h-3 w-3" />} Screen
                    </Badge>
                    <Badge variant="secondary" className="font-mono text-xs flex items-center gap-1">
                      {isMicActive ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />} Audio
                    </Badge>
                  </>
                )}
              </div>
              <Badge variant="secondary" className="font-mono text-xs">{selectedRole}</Badge>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <Card className="border-border/50 bg-card/80">
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-primary" /> Screen Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="relative aspect-video bg-background rounded-lg overflow-hidden">
                  <video ref={videoRef} autoPlay muted className="w-full h-full object-contain" />
                  {!isScreenSharing && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <MonitorOff className="h-12 w-12 mx-auto mb-3" />
                        <p className="text-sm">Screen sharing not active</p>
                      </div>
                    </div>
                  )}
                  {isAISpeaking && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-destructive/90 animate-pulse font-mono text-xs">AI Speaking</Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            {!isConnected ? (
              <Card className="border-border/50 bg-card/80">
                <CardContent className="p-8 text-center">
                  <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                    <Video className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-foreground mb-2">Ready for Live Interview?</h3>
                  <p className="text-sm text-muted-foreground mb-6">Screen sharing + voice. AI watches and provides real-time feedback.</p>
                  <Button onClick={startLiveInterview} disabled={connectionStatus === 'connecting'} size="lg" className="gap-2">
                    {connectionStatus === 'connecting' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Video className="h-5 w-5" />}
                    {connectionStatus === 'connecting' ? 'Connecting...' : 'Start Live Interview'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/50 bg-card/80">
                <CardContent className="p-4">
                  <Button variant="destructive" onClick={stopInterview} className="w-full gap-2">
                    <VideoOff className="h-4 w-4" /> End Interview
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            {currentQuestion && (
              <Card className="border-border/50 bg-card/80">
                <CardHeader>
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" /> Current Question
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground">{currentQuestion}</p>
                </CardContent>
              </Card>
            )}
            <Card className="border-border/50 bg-card/80">
              <CardContent className="p-8">
                <div className="flex flex-col items-center gap-6">
                  <div className={cn(
                    "h-24 w-24 rounded-2xl flex items-center justify-center transition-all",
                    isAISpeaking ? "bg-accent/20 animate-pulse" :
                    isMicActive ? "bg-primary/20 animate-pulse" :
                    "bg-secondary"
                  )}>
                    {isAISpeaking ? <Sparkles className="h-12 w-12 text-accent" /> :
                     isMicActive ? <Mic className="h-12 w-12 text-primary" /> :
                     <MicOff className="h-12 w-12 text-muted-foreground" />}
                  </div>
                  <div className="text-center">
                    <p className="font-display text-xl font-bold text-foreground mb-1">
                      {isAISpeaking ? 'AI Speaking' : isMicActive ? 'You can speak now' : 'Waiting...'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isAISpeaking ? 'Listening to the question...' :
                       isMicActive ? 'The AI is watching your screen' : 'Start the interview to begin'}
                    </p>
                  </div>
                </div>
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
      </div>
    </div>
  )
}
