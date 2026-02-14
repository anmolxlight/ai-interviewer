import { MessageSquare, Mic, Zap, CheckCircle2, Video } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { InterviewMode } from '@/store/slices/interviewSlice'

interface InterviewModeSelectorProps {
  onModeSelect: (mode: InterviewMode) => void
}

export function InterviewModeSelector({ onModeSelect }: InterviewModeSelectorProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-100 p-4">
      <style>{`
        .mode-card {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .mode-card:hover {
          transform: translateY(-12px) scale(1.02);
          box-shadow: 0 25px 50px -12px rgba(139, 92, 246, 0.25);
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4); }
          50% { box-shadow: 0 0 0 20px rgba(139, 92, 246, 0); }
        }
        .pulse-effect {
          animation: pulse-glow 2s infinite;
        }
      `}</style>

      <Card className="w-full max-w-6xl shadow-2xl border-0">
        <CardHeader className="text-center pb-8 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white rounded-t-xl">
          <div className="flex items-center justify-center mb-4">
            <Zap className="h-16 w-16 animate-pulse" />
          </div>
          <CardTitle className="text-5xl font-bold mb-3">Choose Your Interview Mode</CardTitle>
          <CardDescription className="text-violet-100 text-xl">
            Select how you'd like to showcase your skills
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Chat Interview Card */}
            <div className="mode-card cursor-pointer" onClick={() => onModeSelect('chat')}>
              <Card className="h-full border-2 hover:border-violet-500 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-4">
                    <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                      <MessageSquare className="h-12 w-12 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-3xl mb-2">Chat Interview</CardTitle>
                  <CardDescription className="text-base">
                    Text-based Q&A with AI evaluation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pb-8">
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-gray-900">6 Tailored Questions</span>
                        <p className="text-sm text-gray-600">2 Easy, 2 Medium, 2 Hard - matched to your role</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-gray-900">Timed Responses</span>
                        <p className="text-sm text-gray-600">3-5 minutes per question</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-gray-900">Instant AI Feedback</span>
                        <p className="text-sm text-gray-600">Detailed evaluation after each answer</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-gray-900">Time to Think</span>
                        <p className="text-sm text-gray-600">Compose thoughtful, well-structured responses</p>
                      </div>
                    </li>
                  </ul>
                  <Button 
                    className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg mt-6"
                    onClick={() => onModeSelect('chat')}
                  >
                    Start Chat Interview →
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Voice Interview Card */}
            <div className="mode-card cursor-pointer relative" onClick={() => onModeSelect('voice')}>
              <div className="absolute -top-3 -right-3 z-10">
                <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg pulse-effect">
                  AI POWERED
                </div>
              </div>
              <Card className="h-full border-2 hover:border-violet-500 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-4">
                    <div className="h-24 w-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                      <Mic className="h-12 w-12 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-3xl mb-2">Real-Time Voice</CardTitle>
                  <CardDescription className="text-base">
                    Live AI conversation powered by Gemini
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pb-8">
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-gray-900">Natural Conversation</span>
                        <p className="text-sm text-gray-600">Speak naturally with AI interviewer</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-gray-900">Real-Time Audio</span>
                        <p className="text-sm text-gray-600">Instant AI voice responses</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-gray-900">Live Transcription</span>
                        <p className="text-sm text-gray-600">See your conversation in real-time</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-gray-900">Dynamic Follow-ups</span>
                        <p className="text-sm text-gray-600">AI adapts questions based on your answers</p>
                      </div>
                    </li>
                  </ul>
                  <Button 
                    className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg mt-6"
                    onClick={() => onModeSelect('voice')}
                  >
                    Start Voice Interview →
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Live Interview Card */}
            <div className="mode-card cursor-pointer relative" onClick={() => onModeSelect('live')}>
              <div className="absolute -top-3 -right-3 z-10">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg pulse-effect">
                  🔥 LIVE CODING
                </div>
              </div>
              <Card className="h-full border-2 hover:border-violet-500 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-4">
                    <div className="h-24 w-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
                      <Video className="h-12 w-12 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-3xl mb-2">Live Interview</CardTitle>
                  <CardDescription className="text-base">
                    Screen share + voice with real-time AI evaluation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pb-8">
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-gray-900">Screen Sharing</span>
                        <p className="text-sm text-gray-600">AI watches you code in real-time</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-gray-900">Live Feedback</span>
                        <p className="text-sm text-gray-600">Instant evaluation as you solve problems</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-gray-900">Voice + Video</span>
                        <p className="text-sm text-gray-600">Most realistic interview experience</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-gray-900">Coding Problems</span>
                        <p className="text-sm text-gray-600">Solve problems in your IDE while AI observes</p>
                      </div>
                    </li>
                  </ul>
                  <Button 
                    className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-lg mt-6"
                    onClick={() => onModeSelect('live')}
                  >
                    Start Live Interview →
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600 text-sm">
              💡 <strong>Tip:</strong> Choose chat for thoughtful responses, voice for dynamic conversation, or live for the most realistic coding interview experience
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
