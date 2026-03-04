import { useState, useEffect, useRef, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '@/store/store'
import { addQuestion, addAnswer, addTranscriptEntry, nextQuestion, completeInterview, setTimeRemaining } from '@/store/slices/interviewSlice'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Progress } from './ui/progress'
import { Badge } from './ui/badge'
import { Clock, Send, Loader2, Sparkles, TrendingUp, Award, RotateCcw } from 'lucide-react'
import { formatTime } from '@/lib/utils'
import axios from 'axios'

const QUESTION_TIME_LIMITS = {
  easy: 180,
  medium: 240,
  hard: 300
}

const DIFFICULTY_SEQUENCE = ['easy', 'easy', 'medium', 'medium', 'hard', 'hard'] as const

interface ChatInterviewProps {
  onStartFresh: () => void
}

export function ChatInterview({ onStartFresh }: ChatInterviewProps) {
  const dispatch = useDispatch()
  const { questions, answers, currentSession, timeRemaining } = useSelector((state: RootState) => state.interview)
  const { resumeText, candidateInfo, selectedRole } = useSelector((state: RootState) => state.candidate)

  const [currentAnswer, setCurrentAnswer] = useState('')
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [summary, setSummary] = useState<any>(null)

  const currentAnswerRef = useRef(currentAnswer)
  const isEvaluatingRef = useRef(isEvaluating)
  const hasGeneratedFirst = useRef(false)

  useEffect(() => { currentAnswerRef.current = currentAnswer }, [currentAnswer])
  useEffect(() => { isEvaluatingRef.current = isEvaluating }, [isEvaluating])

  const currentQuestionIndex = currentSession?.currentQuestionIndex || 0
  const currentQuestion = questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === 5

  useEffect(() => {
    if (questions.length === 0 && !isGeneratingQuestion && !hasGeneratedFirst.current) {
      hasGeneratedFirst.current = true
      generateQuestion(0)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!currentQuestion || currentSession?.isPaused || showSummary) return

    const timer = setInterval(() => {
      const newTime = Math.max(0, timeRemaining - 1)
      dispatch(setTimeRemaining(newTime))

      if (newTime === 0 && !isEvaluatingRef.current) {
        if (currentAnswerRef.current.trim()) {
          handleSubmitAnswer()
        }
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining, currentQuestion, currentSession?.isPaused, showSummary]) // eslint-disable-line react-hooks/exhaustive-deps

  const generateQuestion = async (questionIndex: number) => {
    setIsGeneratingQuestion(true)
    try {
      const difficulty = DIFFICULTY_SEQUENCE[questionIndex]
      const response = await axios.post('/api/generate-question', {
        resume_text: resumeText,
        difficulty,
        role: selectedRole || 'Software Engineer',
        question_number: questionIndex + 1
      })

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
      setIsGeneratingQuestion(false)
    } finally {
      setIsGeneratingQuestion(false)
    }
  }

  const handleSubmitAnswer = useCallback(async () => {
    const answer = currentAnswerRef.current
    if (!answer.trim() || !currentQuestion) return

    setIsEvaluating(true)
    dispatch(addTranscriptEntry({ role: 'candidate', text: answer }))

    try {
      const response = await axios.post('/api/evaluate-answer', {
        question: currentQuestion.text,
        answer: answer,
        difficulty: currentQuestion.difficulty
      })

      if (response.data.success) {
        dispatch(addAnswer({
          questionId: currentQuestion.id,
          text: answer,
          score: response.data.score,
          feedback: response.data.feedback,
          timestamp: new Date().toISOString()
        }))
      }

      if (isLastQuestion) {
        await generateFinalSummary()
      } else {
        dispatch(nextQuestion())
        setCurrentAnswer('')
        await generateQuestion(currentQuestionIndex + 1)
      }
    } catch (error: any) {
      console.error('Error evaluating answer:', error)
    } finally {
      setIsEvaluating(false)
    }
  }, [currentQuestion, isLastQuestion, currentQuestionIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  const generateFinalSummary = async () => {
    try {
      const qaData = questions.map((q, idx) => ({
        question: q.text,
        answer: answers[idx]?.text || '',
        score: answers[idx]?.score || 0,
        difficulty: q.difficulty
      }))

      const response = await axios.post('/api/generate-summary', {
        candidate_name: candidateInfo?.name,
        qa_pairs: qaData
      })

      if (response.data.success) {
        const summaryData = response.data.summary
        setSummary(summaryData)
        dispatch(completeInterview({
          score: summaryData.overall_score,
          summary: JSON.stringify(summaryData)
        }))
        try {
          await axios.post('/api/save-interview', {
            candidate_name: candidateInfo?.name,
            candidate_email: candidateInfo?.email,
            candidate_phone: candidateInfo?.phone,
            resume_text: resumeText,
            mode: 'chat',
            transcript: qaData,
            score: summaryData.overall_score,
            summary: summaryData
          })
        } catch { /* Supabase may not be configured */ }
      }
      setShowSummary(true)
    } catch {
      setShowSummary(true)
      const avgScore = answers.length > 0
        ? Math.round(answers.reduce((sum, a) => sum + (a.score || 0), 0) / answers.length)
        : 0
      setSummary({
        overall_score: avgScore,
        strengths: ['Completed the interview'],
        improvements: ['Continue practicing'],
        recommendation: 'Recommended'
      })
    }
  }

  if (showSummary && summary) {
    return (
      <div className="min-h-screen bg-background grain flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-200px] left-[30%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />
        </div>
        <Card className="w-full max-w-3xl border-border/50 bg-card/80 backdrop-blur-sm relative z-10 animate-in">
          <CardHeader className="border-b border-border/50 pb-6 text-center">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Award className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="font-display text-3xl">Interview Complete</CardTitle>
            <CardDescription>Here's your comprehensive evaluation</CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="text-center py-8 glass rounded-xl">
              <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-card border-2 border-primary/30 mb-4">
                <span className="text-5xl font-display font-bold text-gradient-cyan">{summary.overall_score}</span>
              </div>
              <p className="text-sm text-muted-foreground font-mono">Overall Score</p>
              <Progress value={summary.overall_score} className="mt-4 h-2 max-w-xs mx-auto" />
            </div>

            <div className="glass rounded-xl p-5">
              <h3 className="font-display font-semibold mb-3 flex items-center gap-2 text-primary">
                <TrendingUp className="h-4 w-4" /> Strengths
              </h3>
              <ul className="space-y-2">
                {summary.strengths?.map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                    <span className="text-primary mt-0.5">+</span> {s}
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass rounded-xl p-5">
              <h3 className="font-display font-semibold mb-3 flex items-center gap-2 text-accent">
                <Sparkles className="h-4 w-4" /> Areas to Improve
              </h3>
              <ul className="space-y-2">
                {summary.improvements?.map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                    <span className="text-accent mt-0.5">→</span> {s}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <span className="text-sm text-muted-foreground">Recommendation</span>
              <Badge variant="secondary" className="font-mono">{summary.recommendation}</Badge>
            </div>

            <Button onClick={onStartFresh} className="w-full gap-2">
              <RotateCcw className="h-4 w-4" /> Start New Interview
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isGeneratingQuestion) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center animate-in">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
          <p className="font-display text-xl font-bold text-foreground mb-2">Generating Question...</p>
          <p className="text-sm text-muted-foreground">AI is crafting a question from your resume</p>
        </div>
      </div>
    )
  }

  const progress = ((currentQuestionIndex + 1) / 6) * 100
  const timePercentage = currentQuestion ? (timeRemaining / currentQuestion.timeLimit) * 100 : 100

  return (
    <div className="min-h-screen bg-background grain p-4">
      <div className="max-w-4xl mx-auto py-6 space-y-4">
        <Card className="border-border/50 bg-card/80 overflow-hidden">
          <div className="bg-secondary/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="font-display font-bold text-foreground">
                  Question {currentQuestionIndex + 1}/6
                </span>
                <Badge variant="secondary" className="font-mono text-xs uppercase">
                  {currentQuestion?.difficulty}
                </Badge>
                <Badge variant="secondary" className="font-mono text-xs">
                  {selectedRole}
                </Badge>
              </div>
              <div className={`flex items-center gap-2 font-mono text-sm ${timePercentage < 20 ? 'text-destructive animate-pulse' : 'text-foreground'}`}>
                <Clock className="h-4 w-4" />
                {formatTime(timeRemaining)}
              </div>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        </Card>

        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display text-lg">Question {currentQuestionIndex + 1}</CardTitle>
                <CardDescription className="text-xs">Take your time and be detailed</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg leading-relaxed text-foreground">{currentQuestion?.text}</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" /> Your Answer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="min-h-[200px] text-base resize-none bg-secondary/30 border-border/50 focus:border-primary/50"
              disabled={isEvaluating}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-mono">
                {currentAnswer.length} chars · {currentAnswer.split(/\s+/).filter(Boolean).length} words
              </span>
              <Button
                onClick={handleSubmitAnswer}
                disabled={!currentAnswer.trim() || isEvaluating}
                className="gap-2"
              >
                {isEvaluating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Evaluating...</>
                ) : (
                  <><Send className="h-4 w-4" /> {isLastQuestion ? 'Submit & Finish' : 'Submit Answer'}</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
