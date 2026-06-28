import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { mistral } from "@ai-sdk/mistral";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText } from "ai";

const SYSTEM_PROMPT =
  "Clean up this voice transcription. Remove filler words (um, uh, like, you know), fix grammar, fix punctuation, and make it natural written text. Keep the original meaning and tone. Output only the cleaned text, nothing else.";

function getProvider(id: string, model: string, apiKey?: string) {
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
        apiKey: apiKey || process.env.XAI_API_KEY,
      }).chatModel(model);
    case "deepseek":
      return createOpenAICompatible({
        name: "deepseek",
        baseURL: "https://api.deepseek.com/v1",
        apiKey: apiKey || process.env.DEEPSEEK_API_KEY,
      }).chatModel(model);
    case "mimo":
      return createOpenAICompatible({
        name: "mimo",
        baseURL: "https://api.mimo.ai/v1",
        apiKey: apiKey || process.env.MIMO_API_KEY,
      }).chatModel(model);
    case "llama":
      return createOpenAICompatible({
        name: "llama",
        baseURL: "https://api.together.xyz/v1",
        apiKey: apiKey || process.env.TOGETHER_API_KEY,
      }).chatModel(model);
    case "cohere":
      return createOpenAICompatible({
        name: "cohere",
        baseURL: "https://api.cohere.com/compatibility/v1",
        apiKey: apiKey || process.env.COHERE_API_KEY,
      }).chatModel(model);
    case "fireworks":
      return createOpenAICompatible({
        name: "fireworks",
        baseURL: "https://api.fireworks.ai/inference/v1",
        apiKey: apiKey || process.env.FIREWORKS_API_KEY,
      }).chatModel(model);
    default:
      throw new Error(`Unknown provider: ${id}`);
  }
}

export async function POST(req: Request) {
  const { text, provider, model, apiKey } = await req.json();

  if (!text) {
    return new Response(JSON.stringify({ error: "No text provided" }), {
      status: 400,
    });
  }

  const result = streamText({
    model: getProvider(provider, model, apiKey),
    system: SYSTEM_PROMPT,
    prompt: text,
  });

  return result.toTextStreamResponse();
}
