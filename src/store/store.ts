import { configureStore } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import interviewReducer from './slices/interviewSlice'
import candidateReducer from './slices/candidateSlice'

const interviewPersistConfig = {
  key: 'interview',
  storage,
  whitelist: ['currentSession', 'questions', 'answers']
}

const candidatePersistConfig = {
  key: 'candidate',
  storage,
  whitelist: ['candidateInfo', 'resumeText']
}

const persistedInterviewReducer = persistReducer(interviewPersistConfig, interviewReducer)
const persistedCandidateReducer = persistReducer(candidatePersistConfig, candidateReducer)

export const store = configureStore({
  reducer: {
    interview: persistedInterviewReducer,
    candidate: persistedCandidateReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
})

export const persistor = persistStore(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

