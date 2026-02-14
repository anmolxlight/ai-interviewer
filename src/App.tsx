import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from './store/store'
import { startInterview, InterviewMode } from './store/slices/interviewSlice'
import { ResumeUpload } from './components/ResumeUpload'
import { RoleSelection } from './components/RoleSelection'
import { InterviewModeSelector } from './components/InterviewModeSelector'
import { ChatInterview } from './components/ChatInterview'
import { VoiceInterview } from './components/VoiceInterview'
import { LiveInterview } from './components/LiveInterview'
import { Dashboard } from './components/Dashboard'
import { Button } from './components/ui/button'
import { Users, UserCircle, Sparkles, Zap, Target, TrendingUp } from 'lucide-react'

type AppMode = 'candidate' | 'interviewer'
type CandidateStep = 'upload' | 'role-select' | 'mode-select' | 'interview'

function App() {
  const dispatch = useDispatch()
  const [appMode, setAppMode] = useState<AppMode | null>(null)
  const [candidateStep, setCandidateStep] = useState<CandidateStep>('upload')
  
  const { candidateInfo, selectedRole } = useSelector((state: RootState) => state.candidate)
  const { currentSession } = useSelector((state: RootState) => state.interview)

  // Landing page - choose role
  if (!appMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(5deg); }
          }
          @keyframes glow {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
          .float-animation { animation: float 6s ease-in-out infinite; }
          .glow-animation { animation: glow 3s ease-in-out infinite; }
          .gradient-text {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .glass-effect {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          .hover-lift {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .hover-lift:hover {
            transform: translateY(-10px) scale(1.02);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          }
        `}</style>

        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 float-animation"></div>
          <div className="absolute top-40 right-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 float-animation" style={{ animationDelay: '2s' }}></div>
          <div className="absolute -bottom-8 left-40 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 float-animation" style={{ animationDelay: '4s' }}></div>
        </div>

        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
          {/* Header */}
          <div className="text-center mb-16 max-w-4xl">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <Sparkles className="h-16 w-16 text-yellow-400 glow-animation" />
                <div className="absolute -top-2 -right-2 h-6 w-6 bg-yellow-400 rounded-full animate-ping"></div>
              </div>
            </div>
            <h1 className="text-6xl md:text-7xl font-bold mb-6 text-white leading-tight">
              AI Interview
              <span className="block mt-2 bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                Assistant
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed">
              Experience the future of technical interviews with AI-powered real-time conversations
            </p>
            
            {/* Feature badges */}
            <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
              <div className="glass-effect rounded-full px-4 py-2 text-white text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-400" />
                Real-time AI
              </div>
              <div className="glass-effect rounded-full px-4 py-2 text-white text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-green-400" />
                Role-specific
              </div>
              <div className="glass-effect rounded-full px-4 py-2 text-white text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                Instant Feedback
              </div>
            </div>
          </div>

          {/* Role selection cards */}
          <div className="grid md:grid-cols-2 gap-8 w-full max-w-5xl">
            {/* Candidate Card */}
            <div
              onClick={() => setAppMode('candidate')}
              className="glass-effect rounded-3xl p-8 cursor-pointer hover-lift group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full filter blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-500"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-center mb-6">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                    <UserCircle className="h-14 w-14 text-white" />
                  </div>
                </div>
                
                <h2 className="text-3xl font-bold text-white mb-4 text-center">I'm a Candidate</h2>
                <p className="text-gray-300 text-center mb-6 leading-relaxed">
                  Upload your resume and experience an AI-powered interview tailored to your role
                </p>
                
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-3 text-gray-200">
                    <svg className="h-6 w-6 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Smart resume analysis</span>
                  </li>
                  <li className="flex items-start gap-3 text-gray-200">
                    <svg className="h-6 w-6 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Role-specific questions</span>
                  </li>
                  <li className="flex items-start gap-3 text-gray-200">
                    <svg className="h-6 w-6 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Real-time AI evaluation</span>
                  </li>
                </ul>
                
                <Button 
                  className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg transform group-hover:scale-105 transition-transform"
                >
                  Start Interview →
                </Button>
              </div>
            </div>

            {/* Interviewer Card */}
            <div
              onClick={() => setAppMode('interviewer')}
              className="glass-effect rounded-3xl p-8 cursor-pointer hover-lift group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full filter blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-500"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-center mb-6">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-14 w-14 text-white" />
                  </div>
                </div>
                
                <h2 className="text-3xl font-bold text-white mb-4 text-center">I'm an Interviewer</h2>
                <p className="text-gray-300 text-center mb-6 leading-relaxed">
                  Review candidate interviews with comprehensive AI-generated insights
                </p>
                
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-3 text-gray-200">
                    <svg className="h-6 w-6 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Comprehensive dashboard</span>
                  </li>
                  <li className="flex items-start gap-3 text-gray-200">
                    <svg className="h-6 w-6 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>AI-powered insights</span>
                  </li>
                  <li className="flex items-start gap-3 text-gray-200">
                    <svg className="h-6 w-6 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Full transcripts</span>
                  </li>
                </ul>
                
                <Button 
                  className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 shadow-lg transform group-hover:scale-105 transition-transform"
                >
                  View Dashboard →
                </Button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-16 text-center">
            <p className="text-gray-400 text-sm">
              Powered by Google Gemini AI • Secure & Private
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Interviewer Dashboard
  if (appMode === 'interviewer') {
    return <Dashboard />
  }

  // Candidate Flow
  if (candidateStep === 'upload' && !candidateInfo) {
    return <ResumeUpload onComplete={() => setCandidateStep('role-select')} />
  }

  if (candidateStep === 'role-select' && !selectedRole) {
    return <RoleSelection onComplete={() => setCandidateStep('mode-select')} />
  }

  if (candidateStep === 'mode-select' && !currentSession) {
    return (
      <InterviewModeSelector
        onModeSelect={(mode: InterviewMode) => {
          dispatch(startInterview({ mode }))
          setCandidateStep('interview')
        }}
      />
    )
  }

  if (candidateStep === 'interview' && currentSession) {
    if (currentSession.mode === 'chat') {
      return <ChatInterview />
    } else if (currentSession.mode === 'voice') {
      return <VoiceInterview />
    } else if (currentSession.mode === 'live') {
      return <LiveInterview />
    }
  }

  return <div>Loading...</div>
}

export default App
