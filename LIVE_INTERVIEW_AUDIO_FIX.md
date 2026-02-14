# Live Interview Audio Fix

## Issue
The AI interviewer was not speaking (no audio output) during the Live Interview mode.

## Root Cause
According to the [Gemini Live API documentation](https://ai.google.dev/gemini-api/docs/live-guide), there were two critical issues:

1. **Invalid Configuration**: The `response_modalities` was set to `["AUDIO", "TEXT"]`, but the API only allows **ONE modality per session**
   > "You can only set one modality in the `response_modalities` field. This means that you can configure the model to respond with either text or audio, but not both in the same session."

2. **Mock Implementation**: The backend was using a mock implementation instead of the actual Gemini Live API SDK

## Solution

### Backend Changes (`backend/main.py`)

#### 1. Fixed Response Modalities
```python
# BEFORE (WRONG)
config = {
    "response_modalities": ["AUDIO", "TEXT"],  # ❌ Cannot use both!
}

# AFTER (CORRECT)
config = {
    "response_modalities": ["AUDIO"],  # ✅ Only AUDIO
}
```

#### 2. Implemented Real Gemini Live API Connection
- Using `google.genai.Client().aio.live.connect()` instead of mock
- Proper WebSocket connection to Gemini Live API
- Bidirectional streaming of audio and video

#### 3. Audio Streaming Implementation
```python
async def receive_from_gemini(session_data: dict, ws: WebSocket):
    """Continuously receive responses from Gemini Live API"""
    session = session_data["session"]
    
    async for response in session.receive():
        # Receive PCM audio at 24kHz from Gemini
        if response.data is not None:
            audio_base64 = base64.b64encode(response.data).decode('utf-8')
            await ws.send_json({
                "type": "ai_speech",
                "audio_data": audio_base64
            })
```

#### 4. Real-time Audio Input
```python
# Send candidate's audio to Gemini
await session.send_realtime_input(
    audio=types.Blob(
        data=audio_bytes, 
        mime_type="audio/pcm;rate=16000"
    )
)
```

### Frontend Changes (`src/components/LiveInterview.tsx`)

#### Fixed Audio Playback
The Gemini Live API returns **PCM audio at 24kHz, 16-bit, mono**. Updated the audio player to properly decode and play this format:

```typescript
const playAudioResponse = async (base64Audio: string) => {
  // Decode base64 to Int16 PCM
  const int16Array = new Int16Array(arrayBuffer)
  
  // Convert to Float32 for Web Audio API
  const float32Array = new Float32Array(int16Array.length)
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768.0
  }
  
  // Create audio buffer at 24kHz
  const audioContext = new AudioContext({ sampleRate: 24000 })
  const audioBuffer = audioContext.createBuffer(1, float32Array.length, 24000)
  audioBuffer.copyToChannel(float32Array, 0)
  
  // Play audio
  const source = audioContext.createBufferSource()
  source.buffer = audioBuffer
  source.connect(audioContext.destination)
  source.start(0)
}
```

### Dependencies (`backend/requirements.txt`)
```
google-generativeai>=0.8.3  # Live API support requires latest version
```

## How It Works Now

### Audio Flow
```
Candidate's Microphone
    ↓ (PCM 16kHz)
Frontend Audio Capture
    ↓ (WebSocket)
Backend Python Server
    ↓ (Gemini Live API)
Gemini AI Processing
    ↓ (PCM 24kHz audio response)
Backend receives audio
    ↓ (WebSocket base64)
Frontend Audio Playback
    ↓ (Web Audio API)
Speaker Output 🔊
```

### Video + Audio Integration
1. **Candidate speaks** → Audio streamed to Gemini in real-time
2. **Candidate codes** → Screen captured at 1 FPS, sent to Gemini
3. **Gemini analyzes** → Sees screen + hears voice
4. **Gemini responds** → Audio response played through speakers

## Testing

To test the audio:

1. Start the backend:
   ```bash
   cd backend
   python main.py
   ```

2. Start the frontend:
   ```bash
   npm run dev
   ```

3. Navigate to Live Interview mode
4. Grant microphone and screen sharing permissions
5. You should now **hear the AI interviewer speaking** through your speakers

## Technical Details

### Audio Specifications

| Direction | Format | Sample Rate | Bit Depth | Channels |
|-----------|--------|-------------|-----------|----------|
| Input (Candidate → Gemini) | PCM | 16 kHz | 16-bit | Mono |
| Output (Gemini → Candidate) | PCM | 24 kHz | 16-bit | Mono |

### Models Used
- **Model**: `gemini-2.0-flash-live-001`
- **Architecture**: Half-cascade (text-to-speech output)
- **Benefits**: Better reliability for tool use and production environments

### Alternative: Native Audio Model
For even more natural speech, you can use:
```python
model = "gemini-2.5-flash-native-audio-preview-09-2025"
```

Native audio models provide:
- More natural-sounding speech
- Better multilingual performance
- Affective (emotion-aware) dialogue
- Proactive audio capabilities

## References

- [Gemini Live API Get Started](https://ai.google.dev/gemini-api/docs/live#javascript)
- [Gemini Live API Capabilities Guide](https://ai.google.dev/gemini-api/docs/live-guide)
- [Gemini Models Documentation](https://ai.google.dev/gemini-api/docs/models/gemini)

## Session Limitations

Be aware of these limitations:
- **Audio + Video sessions**: Limited to 2 minutes
- **Audio-only sessions**: Limited to 15 minutes
- **Context window**: 32k tokens for live API models
- Use session management techniques for unlimited extensions

## Next Steps

Consider implementing:
1. **Voice Activity Detection (VAD)** tuning for better turn-taking
2. **Session management** for longer interviews (>2 minutes)
3. **Ephemeral tokens** for client-side authentication security
4. **Tool use** for code execution or search during interviews


