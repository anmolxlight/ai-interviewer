import { useState, useEffect, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from './store/store'
import { startInterview, resetInterview, InterviewMode } from './store/slices/interviewSlice'
import { resetCandidate } from './store/slices/candidateSlice'
import { ResumeUpload } from './components/ResumeUpload'
import { RoleSelection } from './components/RoleSelection'
import { InterviewModeSelector } from './components/InterviewModeSelector'
import { ChatInterview } from './components/ChatInterview'
import { VoiceInterview } from './components/VoiceInterview'
import { LiveInterview } from './components/LiveInterview'
import { Dashboard } from './components/Dashboard'
import { Button } from './components/ui/button'
import { Users, UserCircle, Sparkles, Zap, Target, TrendingUp, ArrowLeft } from 'lucide-react'

type AppMode = 'candidate' | 'interviewer'
type CandidateStep = 'upload' | 'role-select' | 'mode-select' | 'interview'

function App() {
  const dispatch = useDispatch()
  const [appMode, setAppMode] = useState<AppMode | null>(null)
  const [candidateStep, setCandidateStep] = useState<CandidateStep>('upload')
  
  const { candidateInfo, selectedRole } = useSelector((state: RootState) => state.candidate)
  const { currentSession } = useSelector((state: RootState) => state.interview)

  useEffect(() => {
    if (appMode === 'candidate') {
      if (currentSession && !currentSession.isCompleted && candidateInfo && selectedRole) {
        setCandidateStep('interview')
      } else if (selectedRole && candidateInfo) {
        setCandidateStep('mode-select')
      } else if (candidateInfo) {
        setCandidateStep('role-select')
      } else {
        setCandidateStep('upload')
      }
    }
  }, [appMode, candidateInfo, selectedRole, currentSession])

  const handleStartFresh = useCallback(() => {
    dispatch(resetInterview())
    dispatch(resetCandidate())
    setCandidateStep('upload')
    setAppMode(null)
  }, [dispatch])

  const handleBack = useCallback(() => {
    if (candidateStep === 'role-select') {
      dispatch(resetCandidate())
      setCandidateStep('upload')
    } else if (candidateStep === 'mode-select') {
      dispatch(resetInterview())
      setCandidateStep('role-select')
    } else if (candidateStep === 'interview') {
      dispatch(resetInterview())
      setCandidateStep('mode-select')
    }
  }, [candidateStep, dispatch])

  if (!appMode) {
    return (
      <div className="min-h-screen bg-background grain relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-200px] left-[-100px] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] rounded-full bg-accent/5 blur-[120px]" />
        </div>

        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
          <div className="text-center mb-16 max-w-3xl animate-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-mono text-muted-foreground">Powered by Gemini AI</span>
            </div>
            <h1 className="font-display text-6xl md:text-8xl font-800 mb-6 tracking-tight leading-[0.9]">
              <span className="text-foreground">AI Interview</span>
              <br />
              <span className="text-gradient-cyan">Assistant</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Technical interviews reimagined with real-time AI evaluation, voice conversations, and live coding assessment.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-12 animate-in animate-in-delay-1">
            {[
              { icon: Zap, label: 'Real-time AI', color: 'text-primary' },
              { icon: Target, label: 'Role-specific', color: 'text-accent' },
              { icon: TrendingUp, label: 'Instant Feedback', color: 'text-cyan-400' },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="glass rounded-full px-4 py-2 flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-sm text-foreground/70">{label}</span>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl">
            <button
              onClick={() => setAppMode('candidate')}
              className="glass-strong rounded-2xl p-8 text-left group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:glow-cyan animate-in animate-in-delay-2"
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-[60px] transition-opacity duration-500 opacity-0 group-hover:opacity-100" />
              <div className="relative z-10">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <UserCircle className="h-8 w-8 text-primary" />
                </div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">I'm a Candidate</h2>
                <p className="text-muted-foreground mb-6 leading-relaxed text-sm">
                  Upload your resume and experience an AI-powered interview tailored to your role.
                </p>
                <div className="space-y-2 mb-6">
                  {['Smart resume analysis', 'Role-specific questions', 'Real-time AI evaluation'].map(item => (
                    <div key={item} className="flex items-center gap-2 text-sm text-foreground/60">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {item}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  Start Interview
                  <ArrowLeft className="h-4 w-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>

            <button
              onClick={() => setAppMode('interviewer')}
              className="glass-strong rounded-2xl p-8 text-left group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:glow-amber animate-in animate-in-delay-3"
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-accent/5 rounded-full blur-[60px] transition-opacity duration-500 opacity-0 group-hover:opacity-100" />
              <div className="relative z-10">
                <div className="h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
                  <Users className="h-8 w-8 text-accent" />
                </div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">I'm an Interviewer</h2>
                <p className="text-muted-foreground mb-6 leading-relaxed text-sm">
                  Review candidate interviews with comprehensive AI-generated insights and analytics.
                </p>
                <div className="space-y-2 mb-6">
                  {['Comprehensive dashboard', 'AI-powered insights', 'Full transcripts'].map(item => (
                    <div key={item} className="flex items-center gap-2 text-sm text-foreground/60">
                      <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                      {item}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-accent font-semibold text-sm">
                  View Dashboard
                  <ArrowLeft className="h-4 w-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>
          </div>

          <p className="mt-12 text-muted-foreground/50 text-xs font-mono animate-in animate-in-delay-4">
            Secure & Private • Google Gemini AI
          </p>
        </div>
      </div>
    )
  }

  if (appMode === 'interviewer') {
    return <Dashboard onBack={handleStartFresh} />
  }

  if (candidateStep === 'upload') {
    return <ResumeUpload onComplete={() => setCandidateStep('role-select')} onBack={handleStartFresh} />
  }

  if (candidateStep === 'role-select') {
    return <RoleSelection onComplete={() => setCandidateStep('mode-select')} onBack={() => { dispatch(resetCandidate()); setCandidateStep('upload') }} />
  }

  if (candidateStep === 'mode-select') {
    return (
      <InterviewModeSelector
        onModeSelect={(mode: InterviewMode) => {
          dispatch(startInterview({ mode }))
          setCandidateStep('interview')
        }}
        onBack={handleBack}
      />
    )
  }

  if (candidateStep === 'interview' && currentSession) {
    const interviewProps = { onStartFresh: handleStartFresh }
    if (currentSession.mode === 'chat') return <ChatInterview {...interviewProps} />
    if (currentSession.mode === 'voice') return <VoiceInterview {...interviewProps} />
    if (currentSession.mode === 'live') return <LiveInterview {...interviewProps} />
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground mb-4">Something went wrong.</p>
        <Button onClick={handleStartFresh} variant="outline">Start Over</Button>
      </div>
    </div>
  )
}

export default App
