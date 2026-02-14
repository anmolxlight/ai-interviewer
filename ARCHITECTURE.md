# Architecture Documentation

## System Overview

The AI Interview Assistant is a full-stack application with real-time capabilities, built on a modern tech stack optimized for AI integration and user experience.

## High-Level Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser   │ ←─────→ │  FastAPI     │ ←─────→ │  Supabase   │
│  (React)    │  HTTP   │  Backend     │  REST   │  (Postgres) │
│             │  WS     │              │         │             │
└─────────────┘         └──────────────┘         └─────────────┘
      ↓                        ↓
      │                        │
      └────────────────────────┴──────────────→ Gemini AI
                                                  (Google)
```

## Frontend Architecture

### Technology Stack
- **React 18**: Modern hooks-based components
- **TypeScript**: Type safety and developer experience
- **Redux Toolkit**: Centralized state management
- **Redux Persist**: Local persistence for session recovery
- **TailwindCSS**: Utility-first styling
- **Shadcn/UI**: Pre-built accessible components
- **Vite**: Fast development and optimized builds

### Component Hierarchy

```
App
├── Landing Page (Role Selection)
│
├── Candidate Flow
│   ├── ResumeUpload
│   ├── InterviewModeSelector
│   ├── ChatInterview
│   │   ├── Question Display
│   │   ├── Answer Input
│   │   ├── Timer
│   │   └── Progress Tracker
│   └── VoiceInterview
│       ├── WebSocket Connection
│       ├── Audio Recorder
│       ├── Live Transcript
│       └── Visual Feedback
│
└── Interviewer Flow
    └── Dashboard
        ├── Interview List
        ├── Search/Filter
        ├── Statistics
        └── Interview Detail View
```

### State Management

#### Redux Slices

**candidateSlice**
- Resume text
- Candidate information (name, email, phone)
- Loading states

**interviewSlice**
- Current session
- Questions array
- Answers array
- Transcript entries
- Final score and summary
- Timer state

### Data Flow

1. **Resume Upload Flow**
```
User uploads PDF
  → Frontend sends to /api/upload-resume
    → Backend extracts text (PyPDF2)
      → Gemini AI extracts candidate info
        → Returns to frontend
          → Redux stores data
            → UI updates
```

2. **Chat Interview Flow**
```
Interview starts
  → Generate question (/api/generate-question)
    → Display question + start timer
      → User types answer
        → Submit to /api/evaluate-answer
          → Gemini scores answer
            → Next question or complete
              → Generate summary (/api/generate-summary)
                → Save to database (/api/save-interview)
```

3. **Voice Interview Flow**
```
Connect WebSocket
  → Request microphone access
    → Start MediaRecorder
      → Stream audio chunks to backend
        → Gemini Live API processes audio
          → AI speaks response (audio stream)
            → Display transcript
              → Continue until 6 questions complete
```

## Backend Architecture

### Technology Stack
- **FastAPI**: Modern async Python framework
- **Uvicorn**: ASGI server
- **WebSockets**: Real-time communication
- **Google Gemini AI**: LLM for interview intelligence
- **PyPDF2**: PDF parsing
- **Supabase Client**: Database operations

### API Endpoints

#### Resume Processing
```
POST /api/upload-resume
- Accepts: multipart/form-data (PDF file)
- Returns: { resume_text, candidate_info }
- Process: Extract text → Gemini extracts structured data
```

#### Question Generation
```
POST /api/generate-question
- Accepts: { resume_text, difficulty }
- Returns: { question, difficulty }
- Process: Gemini generates domain-specific question
```

#### Answer Evaluation
```
POST /api/evaluate-answer
- Accepts: { question, answer, difficulty }
- Returns: { score, feedback }
- Process: Gemini evaluates correctness and clarity
```

#### Summary Generation
```
POST /api/generate-summary
- Accepts: { candidate_name, qa_pairs }
- Returns: { overall_score, strengths, improvements, recommendation }
- Process: Gemini analyzes all responses
```

#### Interview Storage
```
POST /api/save-interview
- Accepts: { candidate info, transcript, score, summary }
- Returns: { interview_id }
- Process: Insert into Supabase
```

#### Dashboard Data
```
GET /api/interviews
- Returns: Array of all interviews
- Process: Query Supabase, ordered by created_at

GET /api/interviews/:id
- Returns: Single interview with full details
- Process: Query by ID
```

#### Real-Time Voice
```
WS /api/ws/voice-interview/:session_id
- Bidirectional audio streaming
- Message types:
  - audio: Base64 audio chunks
  - transcript: Text updates
  - interview_complete: Final results
```

### AI Integration

#### Gemini AI Usage

**Text Generation (gemini-pro)**
- Question generation based on resume
- Answer evaluation and scoring
- Summary generation with structured output
- Candidate information extraction

**Voice Streaming (gemini-2.5-flash-native-audio)**
- Real-time audio input/output
- Natural conversation flow
- Dynamic question generation
- Live transcription

### Prompt Engineering

**Question Generation Prompt**
```
Based on this resume, generate a [difficulty] interview question
that is relevant to the candidate's background.
The question should be specific, clear, and test their knowledge.

Resume: {resume_text}
```

**Answer Evaluation Prompt**
```
Evaluate this interview answer:
Question: {question}
Answer: {answer}
Difficulty: {difficulty}

Provide:
1. A score from 0-100
2. Brief feedback (2-3 sentences)
```

**Summary Generation Prompt**
```
Generate a comprehensive interview summary:
Questions and Answers: {qa_pairs}

Provide:
1. Overall performance score (0-100)
2. Strengths (bullet points)
3. Areas for improvement (bullet points)
4. Recommendation (Highly Recommended / Recommended / Not Recommended)
```

## Database Architecture

### Schema Design

**interviews table**
```sql
id                UUID PRIMARY KEY
candidate_name    VARCHAR(255)
candidate_email   VARCHAR(255)
candidate_phone   VARCHAR(50)
resume_text       TEXT
mode              VARCHAR(10)    -- 'chat' or 'voice'
transcript        JSONB
score             INTEGER
summary           JSONB
created_at        TIMESTAMP
updated_at        TIMESTAMP
```

**Indexes**
- `idx_interviews_created_at` - Fast sorting by date
- `idx_interviews_score` - Fast sorting by score
- `idx_interviews_candidate_email` - Fast search by email

### Data Models

**Transcript Structure (JSONB)**
```json
[
  {
    "question": "Question text",
    "answer": "Answer text",
    "score": 85,
    "difficulty": "medium"
  }
]
```

**Summary Structure (JSONB)**
```json
{
  "overall_score": 82,
  "strengths": ["Strong technical knowledge", "Clear communication"],
  "improvements": ["More depth in answers", "Better examples"],
  "recommendation": "Highly Recommended"
}
```

## Real-Time Communication

### WebSocket Protocol

**Client → Server Messages**
```json
{
  "type": "init",
  "data": { "candidateName": "...", "resumeText": "..." }
}

{
  "type": "audio",
  "data": "base64_audio_chunk"
}
```

**Server → Client Messages**
```json
{
  "type": "audio_response",
  "data": "base64_audio_chunk"
}

{
  "type": "transcript_update",
  "role": "ai",
  "text": "Question text..."
}

{
  "type": "interview_complete",
  "data": { "score": 85, "summary": {...} }
}
```

### Audio Processing Pipeline

1. **Browser**: MediaRecorder captures microphone
2. **Chunking**: 100ms audio chunks
3. **Encoding**: Convert to base64
4. **WebSocket**: Send to backend
5. **Backend**: Forward to Gemini Live API
6. **Gemini**: Process and generate response
7. **Backend**: Stream audio back
8. **Browser**: Decode and play through AudioContext

## Security Architecture

### API Security
- Environment variables for secrets
- CORS configuration for allowed origins
- Input validation on all endpoints
- Rate limiting (recommended for production)

### Database Security
- Row Level Security (RLS) enabled
- Public read access (for demo)
- Authenticated write access
- Parameterized queries to prevent SQL injection

### Client Security
- No sensitive data in localStorage
- API keys only in server environment
- HTTPS required for production
- CSP headers recommended

## Performance Optimizations

### Frontend
- Code splitting by route
- Lazy loading of heavy components
- Redux persist for instant startup
- Debounced search in dashboard
- Virtual scrolling for large lists (optional)

### Backend
- Async/await for non-blocking I/O
- Connection pooling for database
- WebSocket for efficient real-time communication
- Streaming responses for large data

### Caching Strategy
- Redux persist caches session state
- Browser caches static assets
- Optional Redis for API response caching

## Scalability Considerations

### Horizontal Scaling
- Stateless backend (except WebSocket sessions)
- Session affinity for WebSocket connections
- Database connection pooling
- CDN for frontend assets

### Vertical Scaling
- Increase backend workers
- Optimize database queries
- Add indexes for common queries
- Use read replicas for dashboard

## Monitoring & Logging

### Frontend Logging
- Console errors in development
- Error boundary for React crashes
- Analytics for user flows (optional)

### Backend Logging
- Request/response logging
- Error tracking
- Performance metrics
- WebSocket connection tracking

## Future Enhancements

### Potential Features
1. **Video Interview Mode**: Add camera support
2. **Code Interview**: Integrated code editor
3. **Multi-language Support**: i18n implementation
4. **Advanced Analytics**: ML-based insights
5. **Interview Templates**: Customizable question sets
6. **Collaborative Evaluation**: Multiple interviewers
7. **Calendar Integration**: Schedule interviews
8. **Email Notifications**: Automated updates

### Technical Improvements
1. **Microservices**: Split services
2. **Message Queue**: Async processing
3. **CDN**: Global content delivery
4. **Load Balancer**: Distribute traffic
5. **Kubernetes**: Container orchestration
6. **CI/CD Pipeline**: Automated deployment

---

This architecture supports the current feature set while remaining flexible for future growth.

