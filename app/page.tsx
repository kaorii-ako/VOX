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
  envKey: string;
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
    envKey: "ANTHROPIC_API_KEY",
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
    envKey: "OPENAI_API_KEY",
  },
  {
    id: "google",
    name: "Gemini",
    models: [
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    ],
    envKey: "GOOGLE_GENERATIVE_AI_API_KEY",
  },
  {
    id: "mistral",
    name: "Mistral",
    models: [
      { id: "mistral-large-latest", name: "Mistral Large" },
      { id: "mistral-small-latest", name: "Mistral Small" },
    ],
    envKey: "MISTRAL_API_KEY",
  },
  {
    id: "grok",
    name: "Grok",
    models: [
      { id: "grok-3", name: "Grok 3" },
      { id: "grok-3-mini", name: "Grok 3 Mini" },
      { id: "grok-2", name: "Grok 2" },
    ],
    envKey: "XAI_API_KEY",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    models: [
      { id: "deepseek-chat", name: "DeepSeek V3" },
      { id: "deepseek-reasoner", name: "DeepSeek R1" },
    ],
    envKey: "DEEPSEEK_API_KEY",
  },
  {
    id: "mimo",
    name: "MiMo",
    models: [
      { id: "MiMo-V2-Flash", name: "MiMo V2 Flash" },
      { id: "MiMo-V2-Omni", name: "MiMo V2 Omni" },
    ],
    envKey: "MIMO_API_KEY",
  },
  {
    id: "llama",
    name: "Llama",
    models: [
      { id: "llama-4-maverick", name: "Llama 4 Maverick" },
      { id: "llama-4-scout", name: "Llama 4 Scout" },
      { id: "llama-3.3-70b", name: "Llama 3.3 70B" },
    ],
    envKey: "TOGETHER_API_KEY",
  },
  {
    id: "cohere",
    name: "Cohere",
    models: [
      { id: "command-a", name: "Command A" },
      { id: "command-r-plus", name: "Command R+" },
    ],
    envKey: "COHERE_API_KEY",
  },
  {
    id: "fireworks",
    name: "Fireworks",
    models: [
      { id: "accounts/fireworks/models/llama-v3p3-70b-instruct", name: "Llama 3.3 70B" },
      { id: "accounts/fireworks/models/deepseek-v3", name: "DeepSeek V3" },
    ],
    envKey: "FIREWORKS_API_KEY",
  },
];

const MODIFIER_KEYS = new Set([
  "Shift",
  "Control",
  "Alt",
  "Meta",
  "CapsLock",
  "NumLock",
  "ScrollLock",
]);

function keyDisplayName(key: string): string {
  if (key === " ") return "SPACE";
  if (key.length === 1) return key.toUpperCase();
  return key;
}

export default function Home() {
  const [pttKey, setPttKey] = useState(" ");
  const [binding, setBinding] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [showKeyBtn, setShowKeyBtn] = useState(false);
  const [provider, setProvider] = useState(0);
  const [modelIdx, setModelIdx] = useState(0);
  const [streamText, setStreamText] = useState("");

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem("vox-ptt-key");
    if (savedKey !== null) setPttKey(savedKey);
    const savedProvider = localStorage.getItem("vox-provider");
    if (savedProvider !== null) {
      const idx = PROVIDERS.findIndex((p) => p.id === savedProvider);
      if (idx >= 0) setProvider(idx);
    }
    const savedModel = localStorage.getItem("vox-model");
    if (savedModel !== null) {
      const idx = PROVIDERS[provider].models.findIndex((m) => m.id === savedModel);
      if (idx >= 0) setModelIdx(idx);
    }
  }, []);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        if (blob.size === 0) {
          setRecording(false);
          return;
        }
        setRecording(false);
        setTranscribing(true);
        try {
          const form = new FormData();
          form.append("audio", blob, "recording.webm");
          const res = await fetch("/api/transcribe", { method: "POST", body: form });
          const { transcript } = await res.json();
          if (transcript) {
            setInputText((prev) => (prev ? prev + " " + transcript : transcript));
          }
        } catch (e) {
          console.error("Transcription failed:", e);
        } finally {
          setTranscribing(false);
          inputRef.current?.focus();
        }
      };

      mediaRecorder.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (e) {
      console.error("Mic access denied:", e);
      setRecording(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current?.state === "recording") {
      mediaRecorder.current.stop();
    }
  }, []);

  async function sendMessage() {
    const text = inputText.trim();
    if (!text || streaming) return;

    setInputText("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setStreaming(true);
    setStreamText("");

    try {
      const p = PROVIDERS[provider];
      const m = p.models[modelIdx];
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          provider: p.id,
          model: m.id,
          history: messages,
        }),
      });

      if (!res.ok || !res.body) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Error: failed to get response." },
        ]);
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setStreamText(accumulated);
      }

      setMessages((prev) => [...prev, { role: "assistant", content: accumulated }]);
      setStreamText("");
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error: connection failed." },
      ]);
    } finally {
      setStreaming(false);
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (binding) {
        if (e.key === "Escape") {
          setBinding(false);
          return;
        }
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

    function onKeyUp(e: KeyboardEvent) {
      if (e.key === pttKey && recording) {
        e.preventDefault();
        stopRecording();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [pttKey, binding, recording, streaming, transcribing, startRecording, stopRecording]);

  function onTouchStart(e: React.TouchEvent) {
    if (!recording && !streaming && !transcribing) {
      e.preventDefault();
      startRecording();
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (recording) {
      e.preventDefault();
      stopRecording();
    }
  }

  function switchProvider(idx: number) {
    setProvider(idx);
    setModelIdx(0);
    localStorage.setItem("vox-provider", PROVIDERS[idx].id);
    localStorage.setItem("vox-model", PROVIDERS[idx].models[0].id);
  }

  function switchModel(idx: number) {
    setModelIdx(idx);
    localStorage.setItem("vox-model", PROVIDERS[provider].models[idx].id);
  }

  const currentProvider = PROVIDERS[provider];

  return (
    <div
      className="h-full flex flex-col select-none"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseEnter={() => setShowKeyBtn(true)}
      onMouseLeave={() => setShowKeyBtn(false)}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-white/60 tracking-widest uppercase">
            VOX
          </h1>
          <span className="text-xs text-white/20">|</span>
          <select
            value={provider}
            onChange={(e) => switchProvider(Number(e.target.value))}
            className="bg-transparent text-sm text-white/70 outline-none cursor-pointer hover:text-white transition-colors"
          >
            {PROVIDERS.map((p, i) => (
              <option key={p.id} value={i} className="bg-[#1a1a1a]">
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={modelIdx}
            onChange={(e) => switchModel(Number(e.target.value))}
            className="bg-transparent text-sm text-white/40 outline-none cursor-pointer hover:text-white/70 transition-colors"
          >
            {currentProvider.models.map((m, i) => (
              <option key={m.id} value={i} className="bg-[#1a1a1a]">
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setBinding(true)}
          className={`text-xs text-white/20 hover:text-white/50 transition-opacity ${
            showKeyBtn ? "opacity-100" : "opacity-0"
          }`}
        >
          key: {keyDisplayName(pttKey)} ✎
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && !streaming && (
          <div className="flex items-center justify-center h-full">
            <p className="text-white/15 text-lg">
              hold {keyDisplayName(pttKey)} to speak
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-white/10 text-white/90"
                  : "text-white/70"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {streaming && streamText && (
          <div className="flex justify-start">
            <div className="max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed text-white/70">
              {streamText}
            </div>
          </div>
        )}

        {streaming && !streamText && (
          <div className="flex justify-start">
            <div className="px-4 py-2.5 text-white/30 animate-pulse">...</div>
          </div>
        )}

        <div ref={messagesEnd} />
      </div>

      {/* Input area */}
      <div className="px-4 py-3 border-t border-white/10">
        <div className="flex items-center gap-3">
          {/* Mic button */}
          <button
            onMouseDown={() => {
              if (!recording && !streaming && !transcribing) startRecording();
            }}
            onMouseUp={() => {
              if (recording) stopRecording();
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
              recording
                ? "bg-red-500/80 scale-110"
                : transcribing
                ? "bg-yellow-500/30"
                : "bg-white/10 hover:bg-white/20"
            }`}
          >
            {transcribing ? (
              <span className="text-yellow-400 text-xs">...</span>
            ) : (
              <svg
                className={`w-4 h-4 ${recording ? "text-white" : "text-white/50"}`}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            )}
          </button>

          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={
              recording
                ? "listening..."
                : transcribing
                ? "transcribing..."
                : `hold ${keyDisplayName(pttKey)} or type here...`
            }
            disabled={streaming}
            className="flex-1 bg-white/5 text-white/90 text-sm px-4 py-2.5 rounded-xl outline-none placeholder:text-white/20 disabled:opacity-50 focus:ring-1 focus:ring-white/20"
          />

          {/* Send button */}
          <button
            onClick={sendMessage}
            disabled={!inputText.trim() || streaming}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 transition-colors"
          >
            <svg
              className="w-4 h-4 text-white/50"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Binding overlay */}
      {binding && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
          <div className="text-center">
            <p className="text-3xl text-white/60 font-light">press any key...</p>
            <p className="text-sm text-white/20 mt-4">escape to cancel</p>
          </div>
        </div>
      )}
    </div>
  );
}
