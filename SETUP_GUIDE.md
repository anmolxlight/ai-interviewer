# Quick Setup Guide

This guide will help you get the AI Interview Assistant running in under 10 minutes.

## ⚡ Quick Start

### Step 1: Get Your API Keys (5 minutes)

#### Gemini API Key
1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key (starts with `AIza...`)

#### Supabase (Optional but Recommended)
1. Go to https://supabase.com and sign up
2. Create a new project
3. Wait for setup to complete (~2 minutes)
4. Go to Settings → API
5. Copy:
   - Project URL
   - Anon/Public key
   - Service Role key (for backend)

### Step 2: Install Dependencies (2 minutes)

```bash
# Frontend
npm install

# Backend
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# or: source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
cd ..
```

### Step 3: Configure Environment (1 minute)

Create `.env` in root:
```env
VITE_GEMINI_API_KEY=AIza...your_key
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your_key
VITE_API_URL=http://localhost:8000
```

Create `backend/.env`:
```env
GEMINI_API_KEY=AIza...your_key
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJ...your_service_key
HOST=0.0.0.0
PORT=8000
```

### Step 4: Setup Database (1 minute)

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/schema.sql`
3. Paste and run

### Step 5: Start Application (1 minute)

**Terminal 1 - Backend:**
```bash
cd backend
python main.py
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Open http://localhost:3000

## ✅ Verification

Test the setup:

1. **Landing Page** - Should see "AI Interview Assistant" with two options
2. **Resume Upload** - Upload a PDF, should extract info
3. **Interview Mode** - Should see Chat and Voice options
4. **Chat Interview** - Start chat, AI should generate a question
5. **Dashboard** - Check interviewer view shows saved interviews

## 🔧 Common Issues

### "API Key Invalid"
- Verify Gemini API key is correct
- Check key has proper permissions
- Ensure no extra spaces in `.env`

### "Cannot connect to backend"
- Check backend is running on port 8000
- Verify `VITE_API_URL` matches backend URL
- Check CORS settings in `backend/main.py`

### "Database error"
- Verify Supabase credentials
- Check schema.sql was executed
- Confirm tables exist in Supabase dashboard

### Resume upload fails
- Only PDF files supported currently
- Check file size (< 10MB recommended)
- Verify Gemini API key is valid

## 🎯 Next Steps

Now that everything is running:

1. **Test as Candidate**
   - Upload your resume
   - Try both chat and voice modes
   - Complete a full interview

2. **Test as Interviewer**
   - View the dashboard
   - Check interview details
   - Review transcripts and scores

3. **Customize**
   - Modify question time limits
   - Change UI colors/theme
   - Adjust AI prompts

## 📚 Additional Resources

- [Full README](README.md) - Complete documentation
- [Gemini API Docs](https://ai.google.dev/docs)
- [Supabase Docs](https://supabase.com/docs)
- [FastAPI Docs](https://fastapi.tiangolo.com/)

## 🆘 Need Help?

If you're stuck:
1. Check the error message in browser console
2. Check backend terminal for Python errors
3. Verify all environment variables are set
4. Ensure all dependencies installed correctly

---

Happy interviewing! 🎉

