# VOX

Voice dictation with AI cleanup. Like WisprFlow, but in the browser.

Hold a key, speak, release. Your voice is transcribed and cleaned up by AI, then inserted into the text area.

## Setup

```bash
npm install
npm run dev
```

Open the app, click the gear icon, and add your API keys in Settings.

## How it works

1. Hold **SPACE** (or your configured key) to record
2. Release to transcribe (Whisper / Groq / Deepgram)
3. AI cleans up the text (removes filler words, fixes grammar)
4. Cleaned text appears in the text area

## Settings

Click the gear icon (top right) to configure:

- **Push-to-talk key** — any key on your keyboard
- **Transcription provider** — OpenAI Whisper, Groq Whisper, or Deepgram
- **AI cleanup provider** — Claude, OpenAI, Gemini, Mistral, Grok, DeepSeek, MiMo, Llama, Cohere, Fireworks

API keys are stored in your browser (localStorage). You can also set them as server-side env vars in `.env.local`.

## Stack

Next.js, Tailwind CSS, Vercel AI SDK
