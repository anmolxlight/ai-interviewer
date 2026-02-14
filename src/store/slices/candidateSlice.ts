import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface CandidateInfo {
  name: string
  email: string
  phone: string
}

interface CandidateState {
  candidateInfo: CandidateInfo | null
  resumeText: string
  selectedRole: string
  isLoading: boolean
}

const initialState: CandidateState = {
  candidateInfo: null,
  resumeText: '',
  selectedRole: '',
  isLoading: false,
}

const candidateSlice = createSlice({
  name: 'candidate',
  initialState,
  reducers: {
    setCandidateInfo: (state, action: PayloadAction<CandidateInfo>) => {
      state.candidateInfo = action.payload
    },
    setResumeText: (state, action: PayloadAction<string>) => {
      state.resumeText = action.payload
    },
    setSelectedRole: (state, action: PayloadAction<string>) => {
      state.selectedRole = action.payload
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    resetCandidate: (state) => {
      state.candidateInfo = null
      state.resumeText = ''
      state.selectedRole = ''
      state.isLoading = false
    },
  },
})

export const { setCandidateInfo, setResumeText, setSelectedRole, setLoading, resetCandidate } = candidateSlice.actions
export default candidateSlice.reducer

