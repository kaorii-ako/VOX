import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";

export async function POST(req: Request) {
  const { message } = await req.json();

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system:
      "You are a concise voice assistant. Respond in 1–3 short sentences maximum. No markdown.",
    prompt: message,
  });

  return result.toTextStreamResponse();
}
