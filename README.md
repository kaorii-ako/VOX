# VOX

Push-to-talk AI in the browser.

Hold a key → speak → get a response from Claude. No mouse required.

## Setup

```bash
npm install
```

Add your API keys to `.env.local`:

```
ANTHROPIC_API_KEY=your-key-here
OPENAI_API_KEY=your-key-here
```

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How it works

| State | UI | Action |
|-------|-----|--------|
| IDLE | "hold SPACE" | Hold the configured key |
| RECORDING | Pulsing red dot | Release the key |
| THINKING | "..." | Audio is transcribed, sent to Claude |
| RESPONDING | Streaming text | Fades to IDLE after 8s |

- Default key: SPACE
- Click "change key" (bottom-right, visible on hover) to rebind
- Mobile: tap and hold anywhere on screen
- Key choice persists in localStorage

## Stack

- Next.js 15 (App Router)
- Tailwind CSS
- Vercel AI SDK + Claude Sonnet
- OpenAI Whisper API
