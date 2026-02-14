import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export type InterviewMode = 'chat' | 'voice' | 'live' | null
export type QuestionDifficulty = 'easy' | 'medium' | 'hard'

export interface Question {
  id: string
  text: string
  difficulty: QuestionDifficulty
  timeLimit: number
}

export interface Answer {
  questionId: string
  text: string
  score?: number
  feedback?: string
  timestamp: string
}

export interface InterviewSession {
  id: string
  mode: InterviewMode
  startTime: string
  currentQuestionIndex: number
  isPaused: boolean
  isCompleted: boolean
}

interface InterviewState {
  currentSession: InterviewSession | null
  questions: Question[]
  answers: Answer[]
  transcript: Array<{ role: 'ai' | 'candidate', text: string, timestamp: string }>
  finalScore: number | null
  finalSummary: string | null
  timeRemaining: number
}

const initialState: InterviewState = {
  currentSession: null,
  questions: [],
  answers: [],
  transcript: [],
  finalScore: null,
  finalSummary: null,
  timeRemaining: 0,
}

const interviewSlice = createSlice({
  name: 'interview',
  initialState,
  reducers: {
    startInterview: (state, action: PayloadAction<{ mode: InterviewMode }>) => {
      state.currentSession = {
        id: Date.now().toString(),
        mode: action.payload.mode,
        startTime: new Date().toISOString(),
        currentQuestionIndex: 0,
        isPaused: false,
        isCompleted: false,
      }
      state.questions = []
      state.answers = []
      state.transcript = []
      state.finalScore = null
      state.finalSummary = null
    },
    addQuestion: (state, action: PayloadAction<Question>) => {
      state.questions.push(action.payload)
    },
    addAnswer: (state, action: PayloadAction<Answer>) => {
      state.answers.push(action.payload)
    },
    addTranscriptEntry: (state, action: PayloadAction<{ role: 'ai' | 'candidate', text: string }>) => {
      state.transcript.push({
        ...action.payload,
        timestamp: new Date().toISOString()
      })
    },
    nextQuestion: (state) => {
      if (state.currentSession) {
        state.currentSession.currentQuestionIndex += 1
      }
    },
    pauseInterview: (state) => {
      if (state.currentSession) {
        state.currentSession.isPaused = true
      }
    },
    resumeInterview: (state) => {
      if (state.currentSession) {
        state.currentSession.isPaused = false
      }
    },
    completeInterview: (state, action: PayloadAction<{ score: number, summary: string }>) => {
      if (state.currentSession) {
        state.currentSession.isCompleted = true
      }
      state.finalScore = action.payload.score
      state.finalSummary = action.payload.summary
    },
    setTimeRemaining: (state, action: PayloadAction<number>) => {
      state.timeRemaining = action.payload
    },
    resetInterview: (state) => {
      return initialState
    },
  },
})

export const {
  startInterview,
  addQuestion,
  addAnswer,
  addTranscriptEntry,
  nextQuestion,
  pauseInterview,
  resumeInterview,
  completeInterview,
  setTimeRemaining,
  resetInterview,
} = interviewSlice.actions

export default interviewSlice.reducer

