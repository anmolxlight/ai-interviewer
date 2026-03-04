import { MessageSquare, Mic, Video, ArrowLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { InterviewMode } from '@/store/slices/interviewSlice'

interface InterviewModeSelectorProps {
  onModeSelect: (mode: InterviewMode) => void
  onBack: () => void
}

const MODES = [
  {
    id: 'chat' as const,
    icon: MessageSquare,
    title: 'Chat Interview',
    subtitle: 'Text-based Q&A with AI evaluation',
    features: ['6 Tailored Questions', 'Timed Responses', 'Instant AI Feedback', 'Time to Think'],
    tag: null,
  },
  {
    id: 'voice' as const,
    icon: Mic,
    title: 'Voice Interview',
    subtitle: 'Real-time audio conversation with AI',
    features: ['Natural Conversation', 'Real-Time Audio', 'Live Transcription', 'Dynamic Follow-ups'],
    tag: 'AI Powered',
  },
  {
    id: 'live' as const,
    icon: Video,
    title: 'Live Coding',
    subtitle: 'Screen share + voice with real-time evaluation',
    features: ['Screen Sharing', 'Live Feedback', 'Voice + Video', 'Coding Problems'],
    tag: 'Most Realistic',
  },
]

export function InterviewModeSelector({ onModeSelect, onBack }: InterviewModeSelectorProps) {
  return (
    <div className="min-h-screen bg-background grain flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-200px] left-[50%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />

      <div className="w-full max-w-5xl relative z-10">
        <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 text-sm">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="border-b border-border/50 pb-6">
            <CardTitle className="font-display text-3xl">Choose Interview Mode</CardTitle>
            <CardDescription>Select how you'd like to showcase your skills</CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-4">
              {MODES.map((mode) => {
                const Icon = mode.icon
                return (
                  <button
                    key={mode.id}
                    onClick={() => onModeSelect(mode.id)}
                    className="group glass-strong rounded-xl p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:glow-cyan relative overflow-hidden"
                  >
                    {mode.tag && (
                      <div className="absolute top-3 right-3">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {mode.tag}
                        </span>
                      </div>
                    )}
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-foreground mb-1">{mode.title}</h3>
                    <p className="text-sm text-muted-foreground mb-5">{mode.subtitle}</p>
                    <div className="space-y-2 mb-6">
                      {mode.features.map(f => (
                        <div key={f} className="flex items-center gap-2 text-sm text-foreground/60">
                          <div className="h-1 w-1 rounded-full bg-primary" />
                          {f}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-primary text-sm font-semibold group-hover:gap-2 transition-all">
                      Start <ChevronRight className="h-4 w-4" />
                    </div>
                  </button>
                )
              })}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-6 font-mono">
              Chat for thoughtful responses · Voice for dynamic conversation · Live for coding interviews
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
