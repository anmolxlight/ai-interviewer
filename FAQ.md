# Frequently Asked Questions (FAQ)

## General Questions

### What is AI Interview Assistant?
A full-stack platform that enables AI-powered technical interviews through chat or real-time voice interaction. It uses Google's Gemini AI to generate questions, evaluate answers, and provide comprehensive feedback.

### Is this free to use?
Yes, the code is open-source (MIT License). However, you'll need:
- **Gemini API Key**: Free tier available (60 requests/minute)
- **Supabase**: Free tier available (up to 500MB database)
- **Hosting**: Free options available (Vercel, Railway)

### What makes this different from other interview tools?
- Real-time AI voice interviews using Gemini Live
- Automatic question generation based on resume
- Instant AI evaluation and feedback
- Both candidate and interviewer interfaces
- Session persistence and recovery
- Modern, responsive UI
- Open-source and customizable

## Setup Questions

### Do I need to be a developer to set this up?
Basic technical knowledge is helpful, but we provide:
- Automated setup scripts (`setup.bat` / `setup.sh`)
- Step-by-step guides
- Pre-configured environments
- Docker support for easy deployment

### Which operating systems are supported?
- **Windows**: Full support (setup.bat provided)
- **macOS**: Full support (setup.sh provided)
- **Linux**: Full support (setup.sh provided)
- **Docker**: Works on all platforms

### What are the system requirements?
**Minimum:**
- Node.js 18+
- Python 3.9+
- 4GB RAM
- Modern browser (Chrome, Firefox, Edge)

**Recommended:**
- Node.js 20+
- Python 3.11+
- 8GB RAM
- Fast internet for voice mode

### How long does setup take?
- **Quick Start**: ~5 minutes (using setup scripts)
- **Manual Setup**: ~10 minutes
- **With Database**: +2 minutes for Supabase setup

### Can I run this without Supabase?
Yes! The app works without Supabase, but:
- ✅ Resume upload works
- ✅ Interviews work
- ✅ AI evaluation works
- ❌ Interviews won't be saved
- ❌ Dashboard will be empty

Good for testing, but use Supabase for production.

## Feature Questions

### How many questions per interview?
**Default**: 6 questions
- 2 Easy (2 minutes each)
- 2 Medium (3 minutes each)
- 2 Hard (4 minutes each)

This is customizable in `src/components/ChatInterview.tsx`.

### How does the AI generate questions?
1. Parses resume text
2. Identifies key skills and experience
3. Uses Gemini AI to generate relevant questions
4. Ensures questions match difficulty level
5. Avoids generic questions

### How accurate is the AI evaluation?
Gemini Pro provides:
- Factual correctness assessment
- Clarity and communication evaluation
- Depth of knowledge analysis
- Comparative scoring (0-100)

Results are generally accurate but should be reviewed by human interviewers for final decisions.

### Can candidates pause and resume interviews?
Yes! Sessions are persisted using Redux Persist:
- Close browser → Resume where you left off
- Refresh page → Continue from last question
- Internet disconnects → Resume when reconnected
- Timer pauses automatically

### Does voice mode really work in real-time?
The infrastructure is built for real-time voice using Gemini Live API:
- WebSocket connection established
- Audio streaming bidirectional
- Live transcription displayed
- Near-instant responses

Note: Full Gemini Live integration requires API access (currently in preview).

### What file formats are supported for resumes?
- **PDF**: ✅ Fully supported
- **DOCX**: ⚠️ Coming in v1.1
- **TXT**: ❌ Not supported (lacks structure)
- **Image**: ❌ Not supported (use PDF)

### Can I customize the interview questions?
**Easy Customization:**
- Modify prompts in `backend/main.py`
- Change difficulty distribution
- Adjust time limits

**Advanced Customization:**
- Create question banks
- Add custom scoring logic
- Implement interview templates

See `ARCHITECTURE.md` for details.

### Is there a limit on interview length?
No hard limits, but defaults:
- Chat: ~15-20 minutes (6 questions)
- Voice: ~20-25 minutes (6 questions)
- Maximum recording: No limit (check storage)

## Technical Questions

### What AI models are used?
- **gemini-pro**: Question generation, evaluation, summaries
- **gemini-2.5-flash-native-audio**: Voice interviews (when available)

### Why FastAPI for the backend?
FastAPI provides:
- High performance (async/await)
- Automatic API documentation
- Type safety with Pydantic
- WebSocket support
- Easy deployment

### Why Redux for state management?
Redux Toolkit offers:
- Predictable state updates
- Easy debugging with DevTools
- Session persistence
- Time-travel debugging
- Middleware support

### How is data security handled?
- API keys in environment variables (never committed)
- CORS protection
- Input validation and sanitization
- Supabase Row-Level Security
- HTTPS in production
- No sensitive data in localStorage

### Can this scale to many concurrent users?
Yes, with proper deployment:
- Backend: Horizontally scalable (stateless)
- Database: Supabase auto-scales
- Frontend: CDN distribution
- WebSocket: Session affinity needed

See `DEPLOYMENT.md` for scaling strategies.

### What's the database schema?
Single main table: `interviews`
- Candidate information
- Resume text
- Interview mode
- Transcript (JSONB)
- Score and summary (JSONB)
- Timestamps

See `supabase/schema.sql` for full schema.

## Troubleshooting Questions

### Resume upload returns "Not provided" for all fields
**Causes:**
- PDF is scanned image (not text)
- PDF is password-protected
- Gemini API key invalid
- Resume format is unusual

**Solutions:**
1. Use text-based PDF
2. Remove password protection
3. Verify API key
4. Manually enter information

### Voice interview doesn't connect
**Causes:**
- Microphone permissions denied
- WebSocket connection blocked
- Backend not running
- Browser incompatibility

**Solutions:**
1. Allow microphone in browser settings
2. Check firewall settings
3. Verify backend is running on port 8000
4. Use Chrome/Edge (best compatibility)

### Questions seem repetitive or generic
**Causes:**
- Resume lacks detail
- AI prompt needs tuning
- Gemini API rate limiting

**Solutions:**
1. Use detailed resume
2. Customize prompts in `backend/main.py`
3. Wait a moment and retry
4. Check API quota

### Dashboard shows no interviews
**Causes:**
- Supabase not configured
- Database schema not created
- RLS policies blocking access
- Backend not saving data

**Solutions:**
1. Verify Supabase credentials in `.env`
2. Run `supabase/schema.sql`
3. Check RLS policies (should allow public read)
4. Check backend logs for errors

### Frontend won't start (port already in use)
**Solution:**
```bash
# Use different port
npm run dev -- --port 3001

# Or kill process using port 3000
# Windows: netstat -ano | findstr :3000
# Mac/Linux: lsof -ti:3000 | xargs kill -9
```

### Backend throws "Module not found"
**Solution:**
```bash
cd backend
pip install -r requirements.txt

# If using venv:
source venv/bin/activate  # Mac/Linux
venv\Scripts\activate     # Windows
pip install -r requirements.txt
```

## Deployment Questions

### Where can I deploy this?
**Recommended:**
- **Frontend**: Vercel (free, easy)
- **Backend**: Railway (free tier)
- **Database**: Supabase (managed)

**Alternatives:**
- AWS, GCP, Azure
- Render (all-in-one)
- Heroku
- Docker on VPS

See `DEPLOYMENT.md` for guides.

### How much does hosting cost?
**Free Tier (< 1000 users/month):**
- Vercel: Free
- Railway: $5/month (after free trial)
- Supabase: Free
- **Total: ~$5/month or free**

**Production (> 10K users):**
- See `DEPLOYMENT.md` cost estimates

### Do I need a domain name?
No, but recommended for production:
- Free deployment URLs work fine
- Custom domain improves credibility
- Costs ~$10-15/year

### Can I deploy behind a corporate firewall?
Yes, but consider:
- Gemini API needs internet access
- WebSocket support required
- HTTPS recommended
- May need VPN/proxy configuration

## Customization Questions

### Can I change the UI colors?
Yes! Edit `src/index.css`:
```css
:root {
  --primary: 221.2 83.2% 53.3%;  /* Blue by default */
  --secondary: 210 40% 96.1%;
  /* Change these values */
}
```

### Can I add more question types?
Yes! Extend in `src/store/slices/interviewSlice.ts`:
```typescript
export type QuestionType = 'technical' | 'behavioral' | 'situational' | 'coding'
```

Then implement handlers in components.

### Can I integrate with my ATS/HRIS?
Yes, the system is designed to be extensible:
- REST API for integrations
- WebSocket for real-time updates
- Export functionality (planned)
- Webhook support (can be added)

### Can I white-label this?
Yes, it's MIT licensed:
- Remove/change branding
- Customize colors and logos
- Add your company name
- Deploy on your domain

### Can I add email notifications?
Not included by default, but easy to add:
1. Use SendGrid/Mailgun
2. Trigger on interview completion
3. Send to candidate and/or interviewer
4. See `ARCHITECTURE.md` for implementation

## Contribution Questions

### Can I contribute to this project?
Yes! Contributions are welcome:
- Bug fixes
- New features
- Documentation improvements
- Testing
- UI/UX enhancements

See `CONTRIBUTING.md` for guidelines.

### How do I report a bug?
1. Check existing GitHub issues
2. Create new issue with:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details
   - Screenshots if applicable

### How do I request a feature?
1. Check existing feature requests
2. Open GitHub issue with:
   - Clear description
   - Use case
   - Proposed implementation
   - Examples or mockups

## License Questions

### What license is this under?
MIT License - very permissive:
- ✅ Commercial use
- ✅ Modification
- ✅ Distribution
- ✅ Private use
- ⚠️ Liability and warranty disclaimers

See `LICENSE` file for full text.

### Can I use this commercially?
Yes! You can:
- Sell access to the platform
- Charge for interviews
- Integrate into paid products
- Deploy for clients

### Do I need to credit the original?
Not required by license, but appreciated:
- Link to original repo
- Mention in documentation
- Give credit where used

## Performance Questions

### How fast are AI responses?
**Typical response times:**
- Question generation: 2-3 seconds
- Answer evaluation: 1-2 seconds
- Summary generation: 3-5 seconds
- Voice response: < 500ms (when fully integrated)

### Can I improve performance?
**Backend:**
- Use Redis caching
- Optimize database queries
- Use CDN for assets
- Enable compression

**Frontend:**
- Code splitting
- Image optimization
- Lazy loading
- Service worker caching

### What's the maximum concurrent users?
**Default setup:**
- ~50-100 concurrent users
- Limited by single backend instance
- Database handles thousands

**Scaled setup:**
- 1000+ concurrent users
- Multiple backend instances
- Load balancer
- Database read replicas

## Future Questions

### What features are coming next?
**v1.1 (planned):**
- Video interviews
- Code interview module
- Interview templates
- Email notifications
- DOCX resume support

**v1.2 (planned):**
- Mobile apps
- Advanced analytics
- Custom question banks
- Team collaboration
- Calendar integration



