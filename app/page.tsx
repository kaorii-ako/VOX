"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Role = "user" | "assistant";
interface Message {
  role: Role;
  content: string;
}
interface Provider {
  id: string;
  name: string;
  models: { id: string; name: string }[];
}

const PROVIDERS: Provider[] = [
  {
    id: "anthropic",
    name: "Claude",
    models: [
      { id: "claude-sonnet-4-6", name: "Sonnet 4" },
      { id: "claude-haiku-4-5-20250414", name: "Haiku 4.5" },
      { id: "claude-opus-4-20250514", name: "Opus 4" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    models: [
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini" },
      { id: "gpt-4.1", name: "GPT-4.1" },
      { id: "o3", name: "o3" },
    ],
  },
  {
    id: "google",
    name: "Gemini",
    models: [
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    ],
  },
  {
    id: "mistral",
    name: "Mistral",
    models: [
      { id: "mistral-large-latest", name: "Mistral Large" },
      { id: "mistral-small-latest", name: "Mistral Small" },
    ],
  },
  {
    id: "grok",
    name: "Grok",
    models: [
      { id: "grok-3", name: "Grok 3" },
      { id: "grok-3-mini", name: "Grok 3 Mini" },
      { id: "grok-2", name: "Grok 2" },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    models: [
      { id: "deepseek-chat", name: "DeepSeek V3" },
      { id: "deepseek-reasoner", name: "DeepSeek R1" },
    ],
  },
  {
    id: "mimo",
    name: "MiMo",
    models: [
      { id: "MiMo-V2-Flash", name: "MiMo V2 Flash" },
      { id: "MiMo-V2-Omni", name: "MiMo V2 Omni" },
    ],
  },
  {
    id: "llama",
    name: "Llama",
    models: [
      { id: "llama-4-maverick", name: "Maverick" },
      { id: "llama-4-scout", name: "Scout" },
      { id: "llama-3.3-70b", name: "3.3 70B" },
    ],
  },
  {
    id: "cohere",
    name: "Cohere",
    models: [
      { id: "command-a", name: "Command A" },
      { id: "command-r-plus", name: "Command R+" },
    ],
  },
  {
    id: "fireworks",
    name: "Fireworks",
    models: [
      { id: "accounts/fireworks/models/llama-v3p3-70b-instruct", name: "Llama 3.3" },
      { id: "accounts/fireworks/models/deepseek-v3", name: "DeepSeek V3" },
    ],
  },
];

const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "Meta", "CapsLock", "NumLock", "ScrollLock"]);

function keyLabel(key: string) {
  if (key === " ") return "space";
  return key.length === 1 ? key.toUpperCase() : key;
}

export default function Home() {
  const [pttKey, setPttKey] = useState(" ");
  const [binding, setBinding] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [provider, setProvider] = useState(0);
  const [modelIdx, setModelIdx] = useState(0);
  const [streamText, setStreamText] = useState("");

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const k = localStorage.getItem("vox-ptt-key");
    if (k) setPttKey(k);
    const p = localStorage.getItem("vox-provider");
    if (p) {
      const i = PROVIDERS.findIndex((x) => x.id === p);
      if (i >= 0) setProvider(i);
    }
    const m = localStorage.getItem("vox-model");
    if (m) {
      const i = PROVIDERS[provider].models.findIndex((x) => x.id === m);
      if (i >= 0) setModelIdx(i);
    }
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunks.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        if (!blob.size) { setRecording(false); return; }
        setRecording(false);
        setTranscribing(true);
        try {
          const fd = new FormData();
          fd.append("audio", blob, "rec.webm");
          const r = await fetch("/api/transcribe", { method: "POST", body: fd });
          const { transcript } = await r.json();
          if (transcript) setInput((prev) => prev ? prev + " " + transcript : transcript);
        } catch (e) { console.error(e); }
        finally { setTranscribing(false); inputRef.current?.focus(); }
      };
      recorder.current = rec;
      rec.start();
      setRecording(true);
    } catch { setRecording(false); }
  }, []);

  const stopRecording = useCallback(() => {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }, []);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setStreaming(true);
    setStreamText("");
    try {
      const p = PROVIDERS[provider];
      const m = p.models[modelIdx];
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, provider: p.id, model: m.id, history: messages }),
      });
      if (!res.ok || !res.body) {
        setMessages((prev) => [...prev, { role: "assistant", content: "error" }]);
        setStreaming(false);
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setStreamText(acc);
      }
      setMessages((prev) => [...prev, { role: "assistant", content: acc }]);
      setStreamText("");
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "error" }]);
    } finally { setStreaming(false); }
  }

  useEffect(() => {
    function onDown(e: KeyboardEvent) {
      if (binding) {
        if (e.key === "Escape") { setBinding(false); return; }
        if (MODIFIER_KEYS.has(e.key)) return;
        setPttKey(e.key);
        localStorage.setItem("vox-ptt-key", e.key);
        setBinding(false);
        return;
      }
      if (e.key === pttKey && !recording && !streaming && !transcribing) {
        e.preventDefault();
        startRecording();
      }
    }
    function onUp(e: KeyboardEvent) {
      if (e.key === pttKey && recording) { e.preventDefault(); stopRecording(); }
    }
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
  }, [pttKey, binding, recording, streaming, transcribing, startRecording, stopRecording]);

  const p = PROVIDERS[provider];

  return (
    <div className="h-full flex flex-col">
      {/* Top */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium tracking-[0.2em] text-white/30 uppercase">vox</span>
          <select
            value={provider}
            onChange={(e) => { setProvider(Number(e.target.value)); setModelIdx(0); localStorage.setItem("vox-provider", PROVIDERS[Number(e.target.value)].id); }}
            className="bg-transparent text-sm text-white/40 outline-none cursor-pointer hover:text-white/60"
          >
            {PROVIDERS.map((pr, i) => <option key={pr.id} value={i} className="bg-[#111]">{pr.name}</option>)}
          </select>
          <select
            value={modelIdx}
            onChange={(e) => { setModelIdx(Number(e.target.value)); localStorage.setItem("vox-model", p.models[Number(e.target.value)].id); }}
            className="bg-transparent text-xs text-white/25 outline-none cursor-pointer hover:text-white/40"
          >
            {p.models.map((m, i) => <option key={m.id} value={i} className="bg-[#111]">{m.name}</option>)}
          </select>
        </div>
        <button
          onClick={() => setBinding(true)}
          className="text-[11px] text-white/15 hover:text-white/40 transition-colors"
        >
          {keyLabel(pttKey)}
        </button>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-6 pb-4">
        {messages.length === 0 && !streaming ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-white/10 text-sm">hold {keyLabel(pttKey)} to speak</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6 py-4">
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === "user" ? "text-right" : "text-left"}>
                <p className={`inline-block text-[15px] leading-relaxed max-w-[85%] ${msg.role === "user" ? "text-white/60" : "text-white/80"}`}>
                  {msg.content}
                </p>
              </div>
            ))}
            {streaming && (
              <div className="text-left">
                <p className="inline-block text-[15px] leading-relaxed text-white/80">
                  {streamText || <span className="text-white/20 animate-pulse">...</span>}
                </p>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </main>

      {/* Input */}
      <footer className="px-6 pb-6 pt-2">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onMouseDown={() => { if (!recording && !streaming && !transcribing) startRecording(); }}
            onMouseUp={() => { if (recording) stopRecording(); }}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
              recording ? "bg-red-500/70 scale-110" : transcribing ? "bg-white/10" : "bg-white/[0.06] hover:bg-white/10"
            }`}
          >
            {transcribing ? (
              <span className="text-white/30 text-[10px]">...</span>
            ) : (
              <svg className={`w-3.5 h-3.5 ${recording ? "text-white" : "text-white/30"}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            )}
          </button>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={recording ? "listening..." : transcribing ? "transcribing..." : `hold ${keyLabel(pttKey)} or type`}
            disabled={streaming}
            className="flex-1 bg-transparent text-white/70 text-[15px] outline-none placeholder:text-white/15 disabled:opacity-40 border-b border-white/[0.06] py-2 focus:border-white/15 transition-colors"
          />
          <button
            onClick={send}
            disabled={!input.trim() || streaming}
            className="text-white/20 hover:text-white/50 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </footer>

      {/* Binding overlay */}
      {binding && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50" onClick={() => setBinding(false)}>
          <p className="text-white/40 text-lg font-light">press any key</p>
        </div>
      )}
    </div>
  );
}
