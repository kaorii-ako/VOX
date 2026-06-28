import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { mistral } from "@ai-sdk/mistral";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText } from "ai";

const SYSTEM_PROMPT =
  "You are a concise voice assistant. Respond in 1-3 short sentences maximum. No markdown.";

interface ChatRequest {
  message: string;
  provider: string;
  model: string;
  history: { role: string; content: string }[];
}

function getProvider(id: string, model: string) {
  switch (id) {
    case "anthropic":
      return anthropic(model);
    case "openai":
      return openai(model);
    case "google":
      return google(model);
    case "mistral":
      return mistral(model);
    case "grok":
      return createOpenAICompatible({
        name: "grok",
        baseURL: "https://api.x.ai/v1",
        apiKey: process.env.XAI_API_KEY,
      }).chatModel(model);
    case "deepseek":
      return createOpenAICompatible({
        name: "deepseek",
        baseURL: "https://api.deepseek.com/v1",
        apiKey: process.env.DEEPSEEK_API_KEY,
      }).chatModel(model);
    case "mimo":
      return createOpenAICompatible({
        name: "mimo",
        baseURL: "https://api.mimo.ai/v1",
        apiKey: process.env.MIMO_API_KEY,
      }).chatModel(model);
    case "llama":
      return createOpenAICompatible({
        name: "llama",
        baseURL: "https://api.together.xyz/v1",
        apiKey: process.env.TOGETHER_API_KEY,
      }).chatModel(model);
    case "cohere":
      return createOpenAICompatible({
        name: "cohere",
        baseURL: "https://api.cohere.com/compatibility/v1",
        apiKey: process.env.COHERE_API_KEY,
      }).chatModel(model);
    case "fireworks":
      return createOpenAICompatible({
        name: "fireworks",
        baseURL: "https://api.fireworks.ai/inference/v1",
        apiKey: process.env.FIREWORKS_API_KEY,
      }).chatModel(model);
    default:
      throw new Error(`Unknown provider: ${id}`);
  }
}

export async function POST(req: Request) {
  const { message, provider, model, history }: ChatRequest = await req.json();

  const messages = [
    ...(history || []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  const result = streamText({
    model: getProvider(provider, model),
    system: SYSTEM_PROMPT,
    messages,
  });

  return result.toTextStreamResponse();
}
