from fastapi import FastAPI, UploadFile, File, WebSocket, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
from dotenv import load_dotenv
import google.generativeai as genai
from supabase import create_client, Client
import json
import asyncio
from datetime import datetime
import base64
import io

load_dotenv()

app = FastAPI(title="AI Interview Assistant API")

# CORS configuration
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS + ["https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY not set!")
else:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        print("✓ Gemini API configured successfully")
    except Exception as e:
        print(f"ERROR: Failed to configure Gemini API: {e}")

# Initialize Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
supabase: Optional[Client] = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


# Models
class CandidateInfo(BaseModel):
    name: str
    email: str
    phone: str
    resume_text: Optional[str] = None


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    candidate_id: str
    message: str
    history: List[Dict[str, str]]


class InterviewSession(BaseModel):
    candidate_id: str
    mode: str  # "chat" or "voice"
    resume_data: CandidateInfo


class QuestionRequest(BaseModel):
    resume_text: str
    difficulty: str  # "easy", "medium", "hard"
    role: str  # Job role user is interviewing for
    question_number: int  # Which question in the sequence


class EvaluationRequest(BaseModel):
    question: str
    answer: str
    difficulty: str


# Helper functions
def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file"""
    try:
        from PyPDF2 import PdfReader
        from io import BytesIO
        
        pdf_file = BytesIO(file_content)
        pdf_reader = PdfReader(pdf_file)
        
        if len(pdf_reader.pages) == 0:
            raise HTTPException(status_code=400, detail="PDF file has no pages")
        
        text = ""
        for page in pdf_reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        
        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF. The file may be image-based or encrypted.")
        
        return text.strip()
    except ImportError:
        raise HTTPException(status_code=500, detail="PyPDF2 library not installed. Please install dependencies.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing PDF: {str(e)}")


def extract_candidate_info(resume_text: str) -> Dict[str, str]:
    """Use Gemini to extract candidate information from resume"""
    try:
        if not GEMINI_API_KEY:
            print("WARNING: GEMINI_API_KEY not set, returning default values")
            return {"name": "Not provided", "email": "Not provided", "phone": "Not provided"}
        
        model = genai.GenerativeModel('gemini-2.5-flash')
        prompt = f"""
        Extract the following information from this resume:
        - Name
        - Email
        - Phone number
        
        Resume text:
        {resume_text[:3000]}
        
        Return ONLY a JSON object with keys: name, email, phone
        If any field is not found, use "Not provided" as the value.
        Do not include any markdown formatting or code blocks, just the raw JSON.
        """
        
        response = model.generate_content(prompt)
        # Parse JSON from response
        result_text = response.text.strip().replace('```json', '').replace('```', '').strip()
        result = json.loads(result_text)
        
        # Ensure all keys exist
        return {
            "name": result.get("name", "Not provided"),
            "email": result.get("email", "Not provided"),
            "phone": result.get("phone", "Not provided")
        }
    except Exception as e:
        print(f"Error extracting candidate info: {e}")
        return {"name": "Not provided", "email": "Not provided", "phone": "Not provided"}


# Routes
@app.get("/")
async def root():
    return {"message": "AI Interview Assistant API", "status": "running"}


@app.post("/api/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    """Upload and parse resume"""
    try:
        print(f"=== Resume Upload Request ===")
        print(f"Filename: {file.filename}")
        print(f"Content-Type: {file.content_type}")
        
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Read file content
        content = await file.read()
        
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="File is empty")
        
        if len(content) > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
        
        # Extract text based on file type
        if file.filename.endswith('.pdf'):
            print("Extracting text from PDF...")
            resume_text = extract_text_from_pdf(content)
            print(f"Extracted {len(resume_text)} characters from PDF")
            if not resume_text or len(resume_text.strip()) == 0:
                raise HTTPException(status_code=400, detail="Could not extract text from PDF. Please ensure it's not a scanned image.")
        elif file.filename.endswith('.docx'):
            # TODO: Implement DOCX parsing
            raise HTTPException(status_code=400, detail="DOCX support coming soon")
        else:
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
        # Extract candidate info
        print("Extracting candidate info with Gemini API...")
        candidate_info = extract_candidate_info(resume_text)
        print(f"Extracted info: {candidate_info}")
        
        print("✓ Upload successful")
        return {
            "success": True,
            "resume_text": resume_text,
            "candidate_info": candidate_info
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading resume: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing resume: {str(e)}")


@app.post("/api/generate-question")
async def generate_question(request: QuestionRequest):
    """Generate interview question based on resume, role, and difficulty"""
    try:
        if not GEMINI_API_KEY:
            raise HTTPException(status_code=500, detail="Gemini API key not configured")
            
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Comprehensive system prompt for question generation
        system_prompt = f"""You are an expert technical interviewer for the role of {request.role}.

CONTEXT:
- Role: {request.role}
- Question Number: {request.question_number} of 6
- Difficulty Level: {request.difficulty.upper()}
- Candidate's Resume: Below

INSTRUCTIONS:
1. Analyze the candidate's resume carefully
2. Generate ONE highly relevant interview question for a {request.role} position
3. The question should:
   - Be directly related to skills/experience shown in their resume
   - Test practical knowledge for {request.role}
   - Match the {request.difficulty} difficulty level appropriately
   - Be clear, specific, and answerable in 2-4 minutes
   - Avoid generic questions - make it unique to this candidate

DIFFICULTY GUIDELINES:
- EASY: Fundamental concepts, definitions, basic scenarios
- MEDIUM: Practical applications, problem-solving, system design basics
- HARD: Complex scenarios, optimization, architecture decisions, edge cases

QUESTION TYPES TO VARY:
- Scenario-based: "How would you handle..."
- Problem-solving: "Design a system that..."
- Experience-based: "Tell me about a time when..."
- Technical deep-dive: "Explain how... works internally"
- Behavioral with technical aspects

CANDIDATE'S RESUME:
{request.resume_text[:2000]}

Generate ONE interview question now. Return ONLY the question text, no preamble or explanation."""

        response = model.generate_content(system_prompt)
        question = response.text.strip()
        
        # Clean up any quotes or formatting
        question = question.replace('"', '').replace('*', '').strip()
        
        return {
            "success": True,
            "question": question,
            "difficulty": request.difficulty,
            "role": request.role
        }
    except Exception as e:
        print(f"Error generating question: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate question: {str(e)}")


@app.post("/api/evaluate-answer")
async def evaluate_answer(request: EvaluationRequest):
    """Evaluate candidate's answer with detailed analysis"""
    try:
        if not GEMINI_API_KEY:
            raise HTTPException(status_code=500, detail="Gemini API key not configured")
            
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        evaluation_prompt = f"""You are an expert technical interviewer. Evaluate this candidate's answer.

QUESTION ({request.difficulty.upper()} difficulty):
{request.question}

CANDIDATE'S ANSWER:
{request.answer}

EVALUATION CRITERIA:
1. Technical Accuracy (40%): Are the facts and concepts correct?
2. Completeness (25%): Did they cover the key points?
3. Clarity (20%): Is the explanation clear and well-structured?
4. Depth (15%): Did they show deep understanding or just surface knowledge?

SCORING GUIDELINES:
- 90-100: Exceptional answer, shows mastery
- 80-89: Strong answer, covers most points well
- 70-79: Good answer, solid understanding
- 60-69: Adequate answer, basic understanding
- 50-59: Weak answer, missing key points
- 0-49: Poor answer, major gaps or incorrect

Provide your evaluation in this EXACT JSON format (no markdown, no code blocks):
{{"score": <number 0-100>, "feedback": "<2-3 concise sentences about what was good and what could be improved>", "strengths": "<one brief strength>", "improvements": "<one brief improvement>"}}"""

        response = model.generate_content(evaluation_prompt)
        result_text = response.text.strip()
        
        # Clean up the response
        result_text = result_text.replace('```json', '').replace('```', '').strip()
        result = json.loads(result_text)
        
        return {
            "success": True,
            "score": int(result.get("score", 60)),
            "feedback": result.get("feedback", "Answer evaluated."),
            "strengths": result.get("strengths", ""),
            "improvements": result.get("improvements", "")
        }
    except Exception as e:
        print(f"Error evaluating answer: {e}")
        # Better fallback based on answer length and keywords
        answer_length = len(request.answer.split())
        base_score = min(70, max(40, answer_length * 2))
        
        return {
            "success": True,
            "score": base_score,
            "feedback": "Your answer has been recorded. Focus on providing detailed, specific examples.",
            "strengths": "Clear communication",
            "improvements": "Add more technical depth"
        }


@app.post("/api/chat")
async def chat(request: ChatRequest):
    """Handle chat interview interaction"""
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Build conversation history
        chat = model.start_chat(history=[])
        
        # Send message
        response = chat.send_message(request.message)
        
        return {
            "success": True,
            "response": response.text
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-summary")
async def generate_summary(interview_data: Dict[str, Any]):
    """Generate final interview summary"""
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        prompt = f"""
        Generate a comprehensive interview summary based on this data:
        
        Candidate: {interview_data.get('candidate_name', 'Unknown')}
        Questions and Answers: {json.dumps(interview_data.get('qa_pairs', []), indent=2)}
        
        Provide:
        1. Overall performance score (0-100)
        2. Strengths (bullet points)
        3. Areas for improvement (bullet points)
        4. Recommendation (Highly Recommended / Recommended / Not Recommended)
        
        Return as JSON with keys: overall_score, strengths (array), improvements (array), recommendation
        """
        
        response = model.generate_content(prompt)
        result = json.loads(response.text.strip().replace('```json', '').replace('```', ''))
        
        return {
            "success": True,
            "summary": result
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


class TTSRequest(BaseModel):
    text: str
    voice_id: str = "JBFqnCBsd6RMkjVDRZzb"


@app.post("/api/tts")
async def text_to_speech(request: TTSRequest):
    """Stream ElevenLabs TTS audio. Falls back to empty response if key not set."""
    from fastapi.responses import StreamingResponse
    eleven_key = os.getenv("ELEVENLABS_API_KEY", "")
    if not eleven_key:
        return JSONResponse({"error": "ElevenLabs API key not configured"}, status_code=501)

    import aiohttp as _aiohttp
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{request.voice_id}/stream"
    headers = {"xi-api-key": eleven_key, "Content-Type": "application/json"}
    payload = {
        "text": request.text,
        "model_id": "eleven_flash_v2_5",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}
    }

    async def stream_audio():
        async with _aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as resp:
                async for chunk in resp.content.iter_chunked(4096):
                    yield chunk

    return StreamingResponse(stream_audio(), media_type="audio/mpeg")


class VoiceTurnRequest(BaseModel):
    resume_text: str
    role: str
    user_response: str
    question_number: int
    conversation_history: List[Dict[str, str]] = []


@app.post("/api/voice-turn")
async def voice_turn(request: VoiceTurnRequest):
    """Handle one turn of a voice interview conversation (HTTP replacement for WebSocket)"""
    try:
        if not GEMINI_API_KEY:
            raise HTTPException(status_code=500, detail="Gemini API key not configured")

        model = genai.GenerativeModel('gemini-2.5-flash')

        history_text = ""
        for entry in request.conversation_history[-6:]:
            role_label = "AI" if entry.get("role") == "ai" else "Candidate"
            history_text += f"{role_label}: {entry.get('text', '')}\n"

        if request.question_number == 0:
            prompt = f"""You are conducting a voice interview for a {request.role} position.

Resume: {request.resume_text[:1500]}

Generate a friendly opening question. Be conversational. Ask about their background or a key skill from their resume.
Return ONLY the question text."""
        elif request.question_number >= 6:
            prompt = f"""You are an AI interviewer for a {request.role} position.
The interview is now complete after 6 questions.

Conversation so far:
{history_text}

Thank the candidate warmly, give brief overall feedback, and say goodbye.
Return ONLY your closing response text."""
        else:
            difficulty = "easier" if request.question_number <= 2 else "medium" if request.question_number <= 4 else "harder"
            prompt = f"""You are an AI interviewer for a {request.role} position.

Candidate's latest answer: {request.user_response}
Resume: {request.resume_text[:1000]}

Previous conversation:
{history_text}

Question {request.question_number + 1} of 6. Ask a {difficulty} question.
Acknowledge their previous answer briefly, then ask the new question.
Return ONLY your response text."""

        response = model.generate_content(prompt)
        ai_text = response.text.strip()

        return {
            "success": True,
            "ai_response": ai_text,
            "question_number": request.question_number + 1,
            "is_complete": request.question_number >= 6
        }
    except Exception as e:
        print(f"Error in voice turn: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.websocket("/api/ws/voice-interview/{session_id}")
async def voice_interview_websocket(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time voice interview with Gemini"""
    await websocket.accept()
    
    question_count = 0
    resume_text = ""
    role = ""
    
    try:
        print(f"Voice interview session started: {session_id}")
        
        while True:
            # Receive data from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "init":
                # Initialize interview with resume and role
                resume_text = message.get("data", {}).get("resumeText", "")
                role = message.get("data", {}).get("role", "Software Engineer")
                
                # Generate and send first question
                try:
                    model = genai.GenerativeModel('gemini-2.5-flash')
                    prompt = f"""You are conducting a voice interview for a {role} position. 

Resume: {resume_text[:1000]}

Generate a friendly opening question to start the interview. Be conversational and natural.
Ask about their background or a key skill from their resume.
Return ONLY the question text."""
                    
                    response = model.generate_content(prompt)
                    question = response.text.strip()
                    
                    await websocket.send_json({
                        "type": "transcript_update",
                        "role": "ai",
                        "text": f"Hello! {question}"
                    })
                    
                    question_count += 1
                    
                except Exception as e:
                    print(f"Error generating question: {e}")
                    await websocket.send_json({
                        "type": "transcript_update",
                        "role": "ai",
                        "text": "Hello! Let's begin the interview. Tell me about yourself and your experience."
                    })
            
            elif message.get("type") == "user_response":
                # User spoke, process their answer
                user_text = message.get("text", "")
                
                await websocket.send_json({
                    "type": "transcript_update",
                    "role": "candidate",
                    "text": user_text
                })
                
                # Generate follow-up question or next question
                if question_count < 6:
                    try:
                        model = genai.GenerativeModel('gemini-2.5-flash')
                        prompt = f"""You are an AI interviewer for a {role} position.

Candidate's previous answer: {user_text}

Resume: {resume_text[:1000]}

Question {question_count + 1} of 6.

Generate the next interview question. It should be natural and conversational.
Acknowledge their previous answer briefly if relevant, then ask the new question.
Vary question difficulty: questions 1-2 should be easier, 3-4 medium, 5-6 harder.

Return ONLY your response text."""
                        
                        response = model.generate_content(prompt)
                        next_question = response.text.strip()
                        
                        await websocket.send_json({
                            "type": "transcript_update",
                            "role": "ai",
                            "text": next_question
                        })
                        
                        question_count += 1
                        
                        if question_count >= 6:
                            # Interview complete
                            await websocket.send_json({
                                "type": "interview_complete",
                                "data": {
                                    "score": 75,
                                    "summary": {
                                        "overall_score": 75,
                                        "recommendation": "Recommended"
                                    }
                                }
                            })
                    
                    except Exception as e:
                        print(f"Error generating follow-up: {e}")
                        await websocket.send_json({
                            "type": "transcript_update",
                            "role": "ai",
                            "text": "Thank you for that answer. Let me ask you another question..."
                        })
            
            elif message.get("type") == "close":
                break
            
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        await websocket.close()
        print(f"Voice interview session ended: {session_id}")


@app.post("/api/save-interview")
async def save_interview(interview_data: Dict[str, Any]):
    """Save interview data to Supabase"""
    try:
        if not supabase:
            raise HTTPException(status_code=500, detail="Database not configured")
        
        # Insert interview record
        result = supabase.table('interviews').insert({
            'candidate_name': interview_data.get('candidate_name'),
            'candidate_email': interview_data.get('candidate_email'),
            'candidate_phone': interview_data.get('candidate_phone'),
            'resume_text': interview_data.get('resume_text'),
            'mode': interview_data.get('mode'),
            'transcript': json.dumps(interview_data.get('transcript', [])),
            'score': interview_data.get('score'),
            'summary': json.dumps(interview_data.get('summary', {})),
            'created_at': datetime.utcnow().isoformat()
        }).execute()
        
        return {
            "success": True,
            "interview_id": result.data[0]['id'] if result.data else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/interviews")
async def get_interviews():
    """Get all interviews"""
    try:
        if not supabase:
            raise HTTPException(status_code=500, detail="Database not configured")
        
        result = supabase.table('interviews').select('*').order('created_at', desc=True).execute()
        
        return {
            "success": True,
            "interviews": result.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/interviews/{interview_id}")
async def get_interview(interview_id: str):
    """Get specific interview details"""
    try:
        if not supabase:
            raise HTTPException(status_code=500, detail="Database not configured")
        
        result = supabase.table('interviews').select('*').eq('id', interview_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Interview not found")
        
        return {
            "success": True,
            "interview": result.data[0]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.websocket("/api/ws/live-interview/{session_id}")
async def live_interview_websocket(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for Gemini Live API real-time interview with screen sharing and audio"""
    await websocket.accept()
    
    resume_text = ""
    role = ""
    gemini_live_session = None
    audio_queue = []
    video_queue = []
    receive_task = None
    
    try:
        print(f"Live interview session started: {session_id}")
        
        # Initialize Gemini Live API connection
        async def init_gemini_live(resume_text: str, role: str):
            """Initialize connection to Gemini Live API using the SDK"""
            try:
                from google import genai as genai_client
                from google.genai import types
                
                client = genai_client.Client(api_key=GEMINI_API_KEY)
                
                # Using the new Gemini Live API
                # gemini-2.0-flash-live-001 supports AUDIO output with half-cascade
                model = "gemini-2.0-flash-live-001"
                
                config = {
                    "response_modalities": ["AUDIO"],  # Only AUDIO - cannot use both AUDIO and TEXT
                    "system_instruction": f"""You are an expert technical interviewer conducting a live coding interview for a {role} position.

You can see the candidate's screen in real-time and hear their voice. Your responsibilities:

1. Give them coding problems appropriate to the {role} role
2. Watch their screen as they solve problems
3. Evaluate their:
   - Problem-solving approach
   - Code quality and style
   - Communication and thinking process
   - Debugging skills
   - Time management
4. Ask follow-up questions based on what you see on their screen
5. Provide real-time hints if they're stuck (but don't give away the answer)
6. Be encouraging and professional
7. Respond with clear spoken audio

Candidate's Resume Summary:
{resume_text[:1000]}

Start by introducing yourself, explaining the format, and giving them the first coding problem.
Keep your responses concise and conversational."""
                }
                
                # Create actual Live API session
                session = await client.aio.live.connect(model=model, config=config)
                
                return {
                    "session": session,
                    "client": client,
                    "types": types
                }
            except Exception as e:
                print(f"Error initializing Gemini Live: {e}")
                import traceback
                traceback.print_exc()
                return None
        
        async def receive_from_gemini(session_data: dict, ws: WebSocket):
            """Continuously receive responses from Gemini Live API and forward to client"""
            try:
                session = session_data["session"]
                
                async for response in session.receive():
                    # Check for audio data (PCM audio at 24kHz)
                    if response.data is not None:
                        # Convert audio bytes to base64
                        audio_base64 = base64.b64encode(response.data).decode('utf-8')
                        
                        await ws.send_json({
                            "type": "ai_speech",
                            "audio_data": audio_base64
                        })
                    
                    # Check for text (transcription or metadata)
                    if response.text is not None:
                        await ws.send_json({
                            "type": "ai_speech",
                            "text": response.text,
                            "audio_data": None
                        })
                    
                    # Check if turn is complete
                    if response.server_content and response.server_content.turn_complete:
                        await ws.send_json({
                            "type": "ai_speech_end"
                        })
                        
            except Exception as e:
                print(f"Error receiving from Gemini: {e}")
                import traceback
                traceback.print_exc()
        
        # Main message loop
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                message = json.loads(data)
                
                if message.get("type") == "init":
                    # Initialize interview
                    resume_text = message.get("data", {}).get("resumeText", "")
                    role = message.get("data", {}).get("role", "Software Engineer")
                    
                    # Initialize Gemini Live session
                    gemini_live_session = await init_gemini_live(resume_text, role)
                    
                    if gemini_live_session and gemini_live_session.get("session"):
                        # Start receiving responses from Gemini in background
                        receive_task = asyncio.create_task(
                            receive_from_gemini(gemini_live_session, websocket)
                        )
                        
                        # Send initial greeting using Gemini Live API
                        session = gemini_live_session["session"]
                        types = gemini_live_session["types"]
                        
                        # Send initial prompt to trigger greeting
                        await session.send_client_content(
                            turns=[{
                                "role": "user", 
                                "parts": [{"text": "Hello! I'm ready to start the interview."}]
                            }],
                            turn_complete=True
                        )
                    else:
                        await websocket.send_json({
                            "type": "error",
                            "message": "Failed to initialize Gemini Live API"
                        })
                
                elif message.get("type") == "audio_chunk":
                    # Received audio chunk from candidate - stream to Gemini
                    if gemini_live_session and gemini_live_session.get("session"):
                        audio_data = message.get("data")
                        session = gemini_live_session["session"]
                        types = gemini_live_session["types"]
                        
                        # Decode base64 audio
                        audio_bytes = base64.b64decode(audio_data)
                        
                        # Send audio to Gemini Live API
                        await session.send_realtime_input(
                            audio=types.Blob(
                                data=audio_bytes, 
                                mime_type="audio/pcm;rate=16000"
                            )
                        )
                
                elif message.get("type") == "video_frame":
                    # Received video frame (screen capture)
                    video_data = message.get("data")
                    video_queue.append(video_data)
                    
                    # Process video every 2 frames to reduce load
                    if len(video_queue) >= 2:
                        try:
                            if gemini_live_session and gemini_live_session.get("session"):
                                # Get latest frame
                                latest_frame = video_queue[-1]
                                session = gemini_live_session["session"]
                                types = gemini_live_session["types"]
                                
                                # Decode base64 image
                                image_bytes = base64.b64decode(latest_frame)
                                
                                # Send image to Gemini along with context
                                await session.send_client_content(
                                    turns=[{
                                        "role": "user",
                                        "parts": [
                                            {
                                                "inline_data": {
                                                    "mime_type": "image/jpeg",
                                                    "data": latest_frame
                                                }
                                            },
                                            {
                                                "text": "Here's what I'm working on. Please evaluate my approach and provide feedback if needed."
                                            }
                                        ]
                                    }],
                                    turn_complete=True
                                )
                            
                            video_queue.clear()
                        except Exception as e:
                            print(f"Error processing video frame: {e}")
                            import traceback
                            traceback.print_exc()
                
                elif message.get("type") == "screen_stopped":
                    # Screen sharing stopped - inform via text prompt
                    if gemini_live_session and gemini_live_session.get("session"):
                        session = gemini_live_session["session"]
                        await session.send_client_content(
                            turns=[{
                                "role": "user",
                                "parts": [{"text": "I've stopped sharing my screen."}]
                            }],
                            turn_complete=True
                        )
                
                elif message.get("type") == "end_interview":
                    # Interview ended by candidate
                    if gemini_live_session and gemini_live_session.get("session"):
                        session = gemini_live_session["session"]
                        await session.close()
                    
                    await websocket.send_json({
                        "type": "interview_complete",
                        "data": {
                            "score": 80,
                            "summary": {
                                "overall_score": 80,
                                "strengths": [
                                    "Good problem-solving approach",
                                    "Clean code structure",
                                    "Effective communication"
                                ],
                                "improvements": [
                                    "Consider edge cases earlier",
                                    "Optimize time complexity"
                                ],
                                "recommendation": "Recommended"
                            }
                        }
                    })
                    break
                
            except asyncio.TimeoutError:
                # Send keep-alive ping
                await websocket.send_json({"type": "ping"})
                
            except Exception as e:
                print(f"Error in message loop: {e}")
                import traceback
                traceback.print_exc()
                break
        
    except Exception as e:
        print(f"WebSocket error in live interview: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Cancel receive task if running
        if receive_task and not receive_task.done():
            receive_task.cancel()
            try:
                await receive_task
            except asyncio.CancelledError:
                pass
        
        # Close Gemini session
        if gemini_live_session and gemini_live_session.get("session"):
            try:
                await gemini_live_session["session"].close()
            except Exception as e:
                print(f"Error closing Gemini session: {e}")
        
        await websocket.close()
        print(f"Live interview session ended: {session_id}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

