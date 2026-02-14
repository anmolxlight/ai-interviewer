# AI-Powered Interview Assistant

A modern, full-stack AI interview platform that allows candidates to complete interviews through chat or real-time voice interaction, powered by Google's Gemini AI.

## 🌟 Features

### For Candidates
- **Resume Upload & Parsing**: Upload PDF resumes with automatic information extraction
- **Three Interview Modes**:
  - **Chat Interview**: Text-based Q&A with timed questions
  - **Voice Interview**: Real-time audio conversation with AI using Gemini Live API
  - **Live Interview** 🔥 **NEW**: Screen sharing + voice with real-time AI evaluation as you code
- **Dynamic Question Generation**: AI generates relevant questions based on resume
- **Real-time Evaluation**: Instant scoring and feedback on answers
- **Screen Sharing**: AI watches your screen as you solve coding problems (Live mode)
- **Progress Tracking**: Visual progress indicators and timers
- **Session Persistence**: Resume interview after disconnection

### For Interviewers
- **Comprehensive Dashboard**: View all candidate interviews
- **Advanced Filtering**: Search and sort by score, date, name, or email
- **Detailed Analytics**: View scores, transcripts, and summaries
- **Performance Insights**: Strengths, weaknesses, and recommendations

## 🏗️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Redux Toolkit** + Redux Persist for state management
- **TailwindCSS** for styling
- **Shadcn/UI** for modern UI components
- **Vite** for fast development and building
- **Lucide React** for icons

### Backend
- **FastAPI** (Python) for REST API
- **WebSocket** support for real-time voice streaming
- **Google Gemini AI** for question generation, evaluation, and voice interaction
- **Supabase** (PostgreSQL) for data persistence

### Infrastructure
- **Supabase** for database and optional authentication
- **WebRTC/WebSocket** for real-time audio streaming

## 📋 Prerequisites

Before you begin, ensure you have:
- **Node.js** (v18 or higher)
- **Python** (v3.9 or higher)
- **npm** or **yarn**
- **Google Gemini API Key** ([Get it here](https://makersuite.google.com/app/apikey))
- **Supabase Account** (optional, [Sign up here](https://supabase.com))
- **Modern Browser** for Live Interview mode:
  - Chrome/Edge (recommended for full feature support)
  - Screen sharing and microphone permissions required
  - ImageCapture API support for video streaming

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ai-interviewer
```

### 2. Frontend Setup

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_API_URL=http://localhost:8000
```

### 3. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
```

Edit `backend/.env` and add your API keys:

```env
GEMINI_API_KEY=your_gemini_api_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_service_key_here
HOST=0.0.0.0
PORT=8000
```

### 4. Database Setup (Supabase)

1. Create a new project on [Supabase](https://supabase.com)
2. Go to the SQL Editor
3. Run the schema from `supabase/schema.sql`
4. Copy your project URL and anon key to the `.env` files

## 🎯 Running the Application

### Start Backend Server

```bash
cd backend
python main.py
# Or use uvicorn directly:
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at `http://localhost:8000`

### Start Frontend Development Server

```bash
# In the root directory
npm run dev
```

The frontend will be available at `http://localhost:3000`

## 📖 Usage Guide

### For Candidates

1. **Landing Page**: Select "I'm a Candidate"
2. **Upload Resume**: Upload your PDF resume (required)
3. **Complete Missing Info**: If extraction fails, manually enter name, email, phone
4. **Choose Interview Mode**:
   - **Chat**: Text-based interview with 6 timed questions (best for thoughtful, written responses)
   - **Voice**: Real-time audio conversation with AI (best for practicing verbal communication)
   - **Live** 🔥: Screen sharing + voice interview (best for coding interviews - AI watches you code in real-time)
5. **Complete Interview**: Answer all questions
6. **View Results**: See your score, strengths, and areas for improvement

#### Live Interview Mode (Screen Share + Voice)

The Live Interview mode provides the most realistic coding interview experience:

1. **Grant Permissions**: 
   - Allow screen sharing (select your IDE, browser tab, or entire screen)
   - Allow microphone access for voice communication
2. **Solve Problems Live**: 
   - AI interviewer asks coding problems
   - Open your preferred IDE or coding environment
   - The AI watches your screen as you code
3. **Think Out Loud**: 
   - Explain your approach as you solve problems
   - AI listens to your explanations via microphone
4. **Get Real-time Feedback**: 
   - AI provides hints if you're stuck
   - Evaluates your problem-solving approach live
   - Asks follow-up questions based on what you're coding

**Best Practices for Live Interview:**
- Use a code editor with good visibility (larger font size)
- Explain your thought process as you code
- Share only the window/tab with your code (not personal information)
- Test your microphone and screen sharing before starting

### For Interviewers

1. **Landing Page**: Select "I'm an Interviewer"
2. **Dashboard**: View all candidate interviews
3. **Filter/Search**: Find specific candidates by name or email
4. **Sort**: Order by score or date
5. **View Details**: Click any interview to see:
   - Candidate information
   - Overall score
   - Interview transcript
   - AI-generated summary with strengths and weaknesses
   - Hiring recommendation

## 🔧 Configuration

### Question Difficulty & Timing

Questions are generated in this sequence:
- 2 Easy questions (2 minutes each)
- 2 Medium questions (3 minutes each)
- 2 Hard questions (4 minutes each)

Edit `src/components/ChatInterview.tsx` to modify:

```typescript
const QUESTION_TIME_LIMITS = {
  easy: 120,    // seconds
  medium: 180,
  hard: 240
}
```

### Voice Interview Settings

The voice interview uses Gemini Live API. To customize voice or model:

Edit `backend/main.py` and modify the WebSocket endpoint configuration.

## 📁 Project Structure

```
ai-interviewer/
├── backend/
│   ├── main.py              # FastAPI backend
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Backend environment template
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # Shadcn UI components
│   │   ├── ResumeUpload.tsx
│   │   ├── InterviewModeSelector.tsx
│   │   ├── ChatInterview.tsx
│   │   ├── VoiceInterview.tsx
│   │   ├── LiveInterview.tsx  # NEW: Screen share + voice interview
│   │   └── Dashboard.tsx
│   ├── store/              # Redux store
│   │   ├── store.ts
│   │   └── slices/
│   ├── lib/                # Utilities
│   │   ├── utils.ts
│   │   ├── supabase.ts
│   │   └── auth.ts
│   ├── App.tsx             # Main app component
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles
├── supabase/
│   └── schema.sql          # Database schema
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

## 🎨 Customization

### Styling

The app uses TailwindCSS with Shadcn/UI. To customize the theme:

1. Edit `src/index.css` to change color variables
2. Modify `tailwind.config.js` for Tailwind settings
3. Update individual components in `src/components/ui/`

### AI Prompts

To customize how AI generates questions or evaluates answers:

Edit prompts in `backend/main.py`:
- `generate_question()` - Question generation
- `evaluate_answer()` - Answer evaluation
- `generate_summary()` - Final summary

## 🔐 Security Considerations

- Store API keys in environment variables (never commit `.env` files)
- Use Supabase Row Level Security (RLS) for data protection
- Enable authentication for interviewer dashboard in production
- Implement rate limiting on API endpoints
- Validate and sanitize all user inputs

## 🚀 Deployment

### Frontend (Vercel)

```bash
# Build the frontend
npm run build

# Deploy to Vercel
vercel deploy
```

### Backend (Railway/Render/AWS)

1. Create a new Python service
2. Set environment variables
3. Deploy from GitHub or Docker
4. Update `VITE_API_URL` in frontend `.env`

### Database

Use Supabase's hosted PostgreSQL (already deployed when you create a project)

## 🐛 Troubleshooting

### Resume Upload Fails
- Ensure PDF is valid and not password-protected
- Check backend logs for parsing errors
- Verify API_URL is correctly set

### Voice Interview Not Working
- Check microphone permissions in browser
- Verify WebSocket connection (check browser console)
- Ensure GEMINI_API_KEY supports Live API

### Database Errors
- Verify Supabase credentials in `.env`
- Check if schema.sql has been executed
- Confirm RLS policies are set correctly

## 📝 API Documentation

### Backend Endpoints

#### Resume Processing
- `POST /api/upload-resume` - Upload and parse resume
- `POST /api/generate-question` - Generate interview question
- `POST /api/evaluate-answer` - Evaluate candidate answer
- `POST /api/generate-summary` - Generate interview summary

#### Data Management
- `POST /api/save-interview` - Save interview to database
- `GET /api/interviews` - Get all interviews
- `GET /api/interviews/{id}` - Get specific interview

#### Real-time
- `WS /api/ws/voice-interview/{session_id}` - WebSocket for voice interview

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.



