import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const audio = formData.get("audio") as File;
  const provider = (formData.get("provider") as string) || "openai";
  const apiKey = formData.get("apiKey") as string;

  if (!audio) {
    return NextResponse.json({ error: "No audio provided" }, { status: 400 });
  }

  const key = apiKey || process.env.OPENAI_API_KEY;

  if (provider === "deepgram") {
    const res = await fetch("https://api.deepgram.com/v1/listen", {
      method: "POST",
      headers: {
        Authorization: `Token ${key}`,
        "Content-Type": audio.type || "audio/webm",
      },
      body: audio,
    });
    if (!res.ok) {
      return NextResponse.json({ error: await res.text() }, { status: res.status });
    }
    const data = await res.json();
    const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
    return NextResponse.json({ transcript: transcript.trim() });
  }

  const baseURL =
    provider === "groq"
      ? "https://api.groq.com/openai/v1"
      : "https://api.openai.com/v1";
  const model =
    provider === "groq" ? "whisper-large-v3" : "whisper-1";

  const whisperForm = new FormData();
  whisperForm.append("file", audio, "audio.webm");
  whisperForm.append("model", model);
  whisperForm.append("response_format", "text");

  const res = await fetch(`${baseURL}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: whisperForm,
  });

  if (!res.ok) {
    return NextResponse.json({ error: await res.text() }, { status: res.status });
  }

  const transcript = await res.text();
  return NextResponse.json({ transcript: transcript.trim() });
}
