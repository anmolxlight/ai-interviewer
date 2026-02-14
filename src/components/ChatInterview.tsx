import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '@/store/store'
import { addQuestion, addAnswer, addTranscriptEntry, nextQuestion, completeInterview, setTimeRemaining } from '@/store/slices/interviewSlice'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Progress } from './ui/progress'
import { Badge } from './ui/badge'
import { Clock, Send, Loader2, Sparkles, TrendingUp, Award } from 'lucide-react'
import { formatTime } from '@/lib/utils'
import axios from 'axios'

const QUESTION_TIME_LIMITS = {
  easy: 180,    // 3 minutes
  medium: 240,  // 4 minutes
  hard: 300     // 5 minutes
}

const DIFFICULTY_SEQUENCE = ['easy', 'easy', 'medium', 'medium', 'hard', 'hard'] as const

export function ChatInterview() {
  const dispatch = useDispatch()
  const { questions, answers, currentSession, timeRemaining } = useSelector((state: RootState) => state.interview)
  const { resumeText, candidateInfo, selectedRole } = useSelector((state: RootState) => state.candidate)
  
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [summary, setSummary] = useState<any>(null)

  const currentQuestionIndex = currentSession?.currentQuestionIndex || 0
  const currentQuestion = questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === 5

  // Generate initial question
  useEffect(() => {
    if (questions.length === 0 && !isGeneratingQuestion) {
      generateQuestion(0)
    }
  }, [])

  // Timer countdown
  useEffect(() => {
    if (!currentQuestion || currentSession?.isPaused || showSummary) return

    const timer = setInterval(() => {
      const newTime = Math.max(0, timeRemaining - 1)
      dispatch(setTimeRemaining(newTime))
      
      if (newTime === 0 && !isEvaluating) {
        // Auto-submit if time runs out
        if (currentAnswer.trim()) {
          handleSubmitAnswer()
        }
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining, currentQuestion, currentSession?.isPaused, showSummary, isEvaluating])

  const generateQuestion = async (questionIndex: number) => {
    setIsGeneratingQuestion(true)
    try {
      const difficulty = DIFFICULTY_SEQUENCE[questionIndex]
      console.log('Generating question:', { questionIndex, difficulty, role: selectedRole })
      
      const response = await axios.post(
        '/api/generate-question',
        {
          resume_text: resumeText,
          difficulty,
          role: selectedRole || 'Software Engineer',
          question_number: questionIndex + 1
        }
      )

      console.log('Question generated:', response.data)

      if (response.data.success) {
        const newQuestion = {
          id: `q${questionIndex}`,
          text: response.data.question,
          difficulty,
          timeLimit: QUESTION_TIME_LIMITS[difficulty]
        }
        
        dispatch(addQuestion(newQuestion))
        dispatch(setTimeRemaining(QUESTION_TIME_LIMITS[difficulty]))
        dispatch(addTranscriptEntry({ role: 'ai', text: `Question ${questionIndex + 1} (${difficulty}): ${response.data.question}` }))
      }
    } catch (error: any) {
      console.error('Error generating question:', error)
      alert(`Failed to generate question: ${error.response?.data?.detail || error.message}. Please check your API configuration.`)
    } finally {
      setIsGeneratingQuestion(false)
    }
  }

  const handleSubmitAnswer = async () => {
    if (!currentAnswer.trim() || !currentQuestion) return

    setIsEvaluating(true)
    dispatch(addTranscriptEntry({ role: 'candidate', text: currentAnswer }))

    try {
      console.log('Evaluating answer...')
      const response = await axios.post(
        '/api/evaluate-answer',
        {
          question: currentQuestion.text,
          answer: currentAnswer,
          difficulty: currentQuestion.difficulty
        }
      )

      console.log('Evaluation received:', response.data)

      if (response.data.success) {
        dispatch(addAnswer({
          questionId: currentQuestion.id,
          text: currentAnswer,
          score: response.data.score,
          feedback: response.data.feedback,
          timestamp: new Date().toISOString()
        }))
      }

      // Move to next question or complete
      if (isLastQuestion) {
        await generateFinalSummary()
      } else {
        dispatch(nextQuestion())
        setCurrentAnswer('')
        await generateQuestion(currentQuestionIndex + 1)
      }
    } catch (error: any) {
      console.error('Error evaluating answer:', error)
      alert(`Failed to evaluate answer: ${error.response?.data?.detail || error.message}`)
    } finally {
      setIsEvaluating(false)
    }
  }

  const generateFinalSummary = async () => {
    try {
      const qaData = questions.map((q, idx) => ({
        question: q.text,
        answer: answers[idx]?.text || '',
        score: answers[idx]?.score || 0,
        difficulty: q.difficulty
      }))

      const response = await axios.post(
        '/api/generate-summary',
        {
          candidate_name: candidateInfo?.name,
          qa_pairs: qaData
        }
      )

      if (response.data.success) {
        const summaryData = response.data.summary
        setSummary(summaryData)
        dispatch(completeInterview({
          score: summaryData.overall_score,
          summary: JSON.stringify(summaryData)
        }))

        // Save to database
        await axios.post(
          '/api/save-interview',
          {
            candidate_name: candidateInfo?.name,
            candidate_email: candidateInfo?.email,
            candidate_phone: candidateInfo?.phone,
            resume_text: resumeText,
            mode: 'chat',
            transcript: qaData,
            score: summaryData.overall_score,
            summary: summaryData
          }
        )
      }

      setShowSummary(true)
    } catch (error) {
      console.error('Error generating summary:', error)
      setShowSummary(true)
      setSummary({
        overall_score: Math.round(answers.reduce((sum, a) => sum + (a.score || 0), 0) / answers.length),
        strengths: ['Completed the interview'],
        improvements: ['Continue practicing'],
        recommendation: 'Recommended'
      })
    }
  }

  if (showSummary && summary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100 p-4">
        <style>{`
          @keyframes confetti {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
          }
          .confetti { animation: confetti 3s linear forwards; }
        `}</style>

        <Card className="w-full max-w-3xl shadow-2xl border-0 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-8 text-center relative overflow-hidden">
            <div className="relative z-10">
              <Award className="h-20 w-20 text-white mx-auto mb-4" />
              <CardTitle className="text-4xl font-bold text-white mb-2">Interview Complete!</CardTitle>
              <CardDescription className="text-emerald-100 text-lg">
                Excellent work! Here's your comprehensive evaluation
              </CardDescription>
            </div>
          </div>

          <CardContent className="p-8 space-y-6">
            <div className="text-center py-8 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl">
              <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-white shadow-xl mb-4">
                <span className="text-6xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  {summary.overall_score}
                </span>
              </div>
              <div className="text-gray-600 font-semibold text-lg">Overall Score</div>
              <Progress value={summary.overall_score} className="mt-4 h-3 max-w-xs mx-auto" />
            </div>

            <div className="bg-green-50 p-6 rounded-xl border-l-4 border-green-500">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-green-700">
                <TrendingUp className="h-5 w-5" />
                Your Strengths
              </h3>
              <ul className="space-y-2">
                {summary.strengths?.map((strength: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-green-600 mt-1 text-xl">✓</span>
                    <span className="text-gray-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-amber-50 p-6 rounded-xl border-l-4 border-amber-500">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-amber-700">
                <Sparkles className="h-5 w-5" />
                Areas to Improve
              </h3>
              <ul className="space-y-2">
                {summary.improvements?.map((improvement: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-600 mt-1 text-xl">→</span>
                    <span className="text-gray-700">{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-6 border-t">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-lg text-gray-700">Final Recommendation:</span>
                <Badge 
                  variant={summary.recommendation === 'Highly Recommended' ? 'default' : 'secondary'}
                  className="text-base px-4 py-2"
                >
                  {summary.recommendation}
                </Badge>
              </div>
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

  if (isGeneratingQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md border-0 shadow-2xl">
          <CardContent className="py-16 text-center">
            <div className="relative inline-block mb-6">
              <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
              <Sparkles className="h-8 w-8 text-yellow-500 absolute -top-2 -right-2 animate-pulse" />
            </div>
            <p className="text-2xl font-bold text-gray-800 mb-2">Generating Your Question...</p>
            <p className="text-gray-600">Our AI is analyzing your resume and creating a tailored question</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const progress = ((currentQuestionIndex + 1) / 6) * 100
  const timePercentage = currentQuestion ? (timeRemaining / currentQuestion.timeLimit) * 100 : 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 p-4">
      <div className="max-w-5xl mx-auto py-8">
        {/* Progress Header */}
        <Card className="mb-6 border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4">
            <div className="flex items-center justify-between text-white mb-3">
              <div className="flex items-center gap-4">
                <span className="text-lg font-bold">
                  Question {currentQuestionIndex + 1} of 6
                </span>
                <Badge variant="secondary" className="bg-white/20 text-white border-0">
                  {currentQuestion?.difficulty.toUpperCase()}
                </Badge>
                <Badge variant="secondary" className="bg-white/20 text-white border-0">
                  {selectedRole}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5" />
                <span className={`font-mono font-bold ${timePercentage < 20 ? 'text-red-300 animate-pulse' : ''}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
            </div>
            <Progress value={progress} className="h-2 bg-white/20" />
          </div>
        </Card>

        {/* Question Card */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">Question {currentQuestionIndex + 1}</CardTitle>
                <CardDescription>Take your time and provide a detailed, thoughtful answer</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-xl leading-relaxed text-gray-800">{currentQuestion?.text}</p>
          </CardContent>
        </Card>

        {/* Answer Input */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-600" />
              Your Answer
            </CardTitle>
            <CardDescription>
              Be specific and provide examples from your experience when possible
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="Type your answer here... Be detailed and specific."
              className="min-h-[240px] text-base resize-none border-2 focus:border-blue-500"
              disabled={isEvaluating}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {currentAnswer.length} characters • {currentAnswer.split(/\s+/).filter(Boolean).length} words
              </span>
              <Button
                onClick={handleSubmitAnswer}
                disabled={!currentAnswer.trim() || isEvaluating}
                size="lg"
                className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Evaluating...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    {isLastQuestion ? 'Submit & Finish' : 'Submit Answer'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
