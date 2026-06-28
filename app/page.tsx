"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

type State = "IDLE" | "RECORDING" | "TRANSCRIBING" | "CLEANING";

interface STTProvider { id: string; name: string; }
interface AIProvider { id: string; name: string; models: { id: string; name: string }[]; }

const STT_PROVIDERS: STTProvider[] = [
  { id: "openai", name: "OpenAI Whisper" },
  { id: "groq", name: "Groq Whisper" },
  { id: "deepgram", name: "Deepgram" },
];

const AI_PROVIDERS: AIProvider[] = [
  { id: "anthropic", name: "Claude", models: [{ id: "claude-sonnet-4-6", name: "Sonnet 4" }, { id: "claude-haiku-4-5-20250414", name: "Haiku 4.5" }, { id: "claude-opus-4-20250514", name: "Opus 4" }] },
  { id: "openai", name: "OpenAI", models: [{ id: "gpt-4o", name: "GPT-4o" }, { id: "gpt-4o-mini", name: "GPT-4o Mini" }, { id: "gpt-4.1", name: "GPT-4.1" }] },
  { id: "google", name: "Gemini", models: [{ id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" }, { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" }] },
  { id: "mistral", name: "Mistral", models: [{ id: "mistral-large-latest", name: "Mistral Large" }, { id: "mistral-small-latest", name: "Mistral Small" }] },
  { id: "grok", name: "Grok", models: [{ id: "grok-3", name: "Grok 3" }, { id: "grok-3-mini", name: "Grok 3 Mini" }] },
  { id: "deepseek", name: "DeepSeek", models: [{ id: "deepseek-chat", name: "DeepSeek V3" }, { id: "deepseek-reasoner", name: "DeepSeek R1" }] },
  { id: "mimo", name: "MiMo", models: [{ id: "MiMo-V2-Flash", name: "MiMo V2 Flash" }, { id: "MiMo-V2-Omni", name: "MiMo V2 Omni" }] },
  { id: "llama", name: "Llama", models: [{ id: "llama-4-maverick", name: "Maverick" }, { id: "llama-4-scout", name: "Scout" }] },
  { id: "cohere", name: "Cohere", models: [{ id: "command-a", name: "Command A" }, { id: "command-r-plus", name: "Command R+" }] },
  { id: "fireworks", name: "Fireworks", models: [{ id: "accounts/fireworks/models/llama-v3p3-70b-instruct", name: "Llama 3.3" }, { id: "accounts/fireworks/models/deepseek-v3", name: "DeepSeek V3" }] },
];

const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "Meta", "CapsLock", "NumLock", "ScrollLock"]);

function keyLabel(key: string) {
  if (key === " ") return "space";
  return key.length === 1 ? key.toUpperCase() : key;
}

export default function Home() {
  const [state, setState] = useState<State>("IDLE");
  const [pttKey, setPttKey] = useState(" ");
  const [text, setText] = useState("");

  const [sttProvider, setSttProvider] = useState(0);
  const [sttApiKey, setSttApiKey] = useState("");
  const [aiProvider, setAiProvider] = useState(0);
  const [aiModel, setAiModel] = useState(0);
  const [aiApiKey, setAiApiKey] = useState("");

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const k = localStorage.getItem("vox-ptt-key");
    if (k) setPttKey(k);
    const sp = localStorage.getItem("vox-stt-provider");
    if (sp) { const i = STT_PROVIDERS.findIndex(p => p.id === sp); if (i >= 0) setSttProvider(i); }
    const sk = localStorage.getItem("vox-stt-apikey");
    if (sk) setSttApiKey(sk);
    const ap = localStorage.getItem("vox-ai-provider");
    if (ap) { const i = AI_PROVIDERS.findIndex(p => p.id === ap); if (i >= 0) setAiProvider(i); }
    const am = localStorage.getItem("vox-ai-model");
    if (am) {
      const pIdx = AI_PROVIDERS.findIndex(p => p.id === (localStorage.getItem("vox-ai-provider") || "anthropic"));
      const mIdx = AI_PROVIDERS[pIdx >= 0 ? pIdx : 0].models.findIndex(m => m.id === am);
      if (mIdx >= 0) setAiModel(mIdx);
    }
    const ak = localStorage.getItem("vox-ai-apikey");
    if (ak) setAiApiKey(ak);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunks.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        if (!blob.size) { setState("IDLE"); return; }
        setState("TRANSCRIBING");
        try {
          const fd = new FormData();
          fd.append("audio", blob, "rec.webm");
          fd.append("provider", STT_PROVIDERS[sttProvider].id);
          if (sttApiKey) fd.append("apiKey", sttApiKey);
          const r = await fetch("/api/transcribe", { method: "POST", body: fd });
          const { transcript } = await r.json();
          if (!transcript) { setState("IDLE"); return; }

          const sttId = STT_PROVIDERS[sttProvider].id;
          const hasSttKey = sttApiKey || sttId === "openai";

          if (hasSttKey) {
            setState("CLEANING");
            try {
              const cr = await fetch("/api/cleanup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  text: transcript,
                  provider: AI_PROVIDERS[aiProvider].id,
                  model: AI_PROVIDERS[aiProvider].models[aiModel].id,
                  apiKey: aiApiKey || undefined,
                }),
              });
              if (cr.ok && cr.body) {
                const reader = cr.body.getReader();
                const dec = new TextDecoder();
                let cleaned = "";
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  cleaned += dec.decode(value, { stream: true });
                }
                setText(prev => prev ? prev + " " + cleaned : cleaned);
              } else {
                setText(prev => prev ? prev + " " + transcript : transcript);
              }
            } catch {
              setText(prev => prev ? prev + " " + transcript : transcript);
            }
          } else {
            setText(prev => prev ? prev + " " + transcript : transcript);
          }
        } catch (e) {
          console.error(e);
        }
        setState("IDLE");
        setTimeout(() => textareaRef.current?.scrollTo({ top: textareaRef.current.scrollHeight }), 50);
      };
      recorder.current = rec;
      rec.start();
      setState("RECORDING");
    } catch (e) {
      console.error(e);
      setState("IDLE");
    }
  }, [sttProvider, sttApiKey, aiProvider, aiModel, aiApiKey]);

  const stopRecording = useCallback(() => {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }, []);

  useEffect(() => {
    function onDown(e: KeyboardEvent) {
      if (e.key === pttKey && state === "IDLE") {
        e.preventDefault();
        startRecording();
      }
    }
    function onUp(e: KeyboardEvent) {
      if (e.key === pttKey && state === "RECORDING") {
        e.preventDefault();
        stopRecording();
      }
    }
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
  }, [pttKey, state, startRecording, stopRecording]);

  const isActive = state === "RECORDING" || state === "TRANSCRIBING" || state === "CLEANING";

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="text-xs font-medium tracking-[0.2em] text-white/30 uppercase">vox</span>
        <Link href="/settings" className="text-white/20 hover:text-white/50 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </Link>
      </header>

      <main className="flex-1 px-6 pb-4 overflow-hidden">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={isActive ? state === "TRANSCRIBING" ? "transcribing..." : "cleaning..." : "your text appears here..."}
          disabled={isActive}
          className="w-full h-full bg-transparent text-white/70 text-base leading-relaxed resize-none outline-none placeholder:text-white/15 disabled:opacity-50"
        />
      </main>

      <footer className="px-6 pb-5 pt-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onMouseDown={() => { if (state === "IDLE") startRecording(); }}
            onMouseUp={() => { if (state === "RECORDING") stopRecording(); }}
            onTouchStart={e => { e.preventDefault(); if (state === "IDLE") startRecording(); }}
            onTouchEnd={e => { e.preventDefault(); if (state === "RECORDING") stopRecording(); }}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
              state === "RECORDING" ? "bg-red-500/70 scale-110" :
              state === "TRANSCRIBING" || state === "CLEANING" ? "bg-yellow-500/20" :
              "bg-white/[0.06] hover:bg-white/10"
            }`}
          >
            {state === "TRANSCRIBING" || state === "CLEANING" ? (
              <span className="text-yellow-400/60 text-[10px]">...</span>
            ) : (
              <svg className={`w-3.5 h-3.5 ${state === "RECORDING" ? "text-white" : "text-white/30"}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            )}
          </button>
          <span className="text-[11px] text-white/15">
            {state === "RECORDING" ? "listening..." :
             state === "TRANSCRIBING" ? "transcribing..." :
             state === "CLEANING" ? "cleaning..." :
             `hold ${keyLabel(pttKey)} to speak`}
          </span>
        </div>
        <button
          onClick={() => setText("")}
          className="text-[11px] text-white/15 hover:text-white/40 transition-colors"
        >
          clear
        </button>
      </footer>
    </div>
  );
}
