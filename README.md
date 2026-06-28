# VOX

Push-to-talk AI chat in the browser.

Hold a key → speak → text appears in the input box → send to any AI provider.

## Setup

```bash
npm install
```

Add your API keys to `.env.local`:

```
OPENAI_API_KEY=          # Required for Whisper transcription
ANTHROPIC_API_KEY=       # Claude
GOOGLE_GENERATIVE_AI_API_KEY=  # Gemini
MISTRAL_API_KEY=         # Mistral
XAI_API_KEY=             # Grok
DEEPSEEK_API_KEY=        # DeepSeek
MIMO_API_KEY=            # MiMo
TOGETHER_API_KEY=        # Llama (Together AI)
COHERE_API_KEY=          # Cohere
FIREWORKS_API_KEY=       # Fireworks
```

Only `OPENAI_API_KEY` is required (for voice transcription). Add others for the providers you want.

## Run

```bash
npm run dev
```

## How it works

1. **Hold SPACE** (or your configured key) → mic records
2. **Release** → Whisper transcribes → text appears in input
3. **Edit** the text if needed, or hold again to add more
4. **Press Enter** or click send → streams response from chosen AI

| Feature | Details |
|---------|---------|
| Voice input | Push-to-talk key or tap-and-hold on mobile |
| Transcription | OpenAI Whisper API |
| AI providers | Claude, OpenAI, Gemini, Mistral, Grok, DeepSeek, MiMo, Llama, Cohere, Fireworks |
| Key binding | Click "key: SPACE ✎" to rebind, saved to localStorage |
| Provider/model | Dropdowns in top bar, saved to localStorage |

## Stack

- Next.js 15 (App Router)
- Tailwind CSS
- Vercel AI SDK (multi-provider)
- OpenAI Whisper API
