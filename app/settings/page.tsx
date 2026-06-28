"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface STTProvider {
  id: string;
  name: string;
}

interface AIProvider {
  id: string;
  name: string;
  models: { id: string; name: string }[];
}

const STT_PROVIDERS: STTProvider[] = [
  { id: "openai", name: "OpenAI Whisper" },
  { id: "groq", name: "Groq Whisper" },
  { id: "deepgram", name: "Deepgram" },
];

const AI_PROVIDERS: AIProvider[] = [
  {
    id: "anthropic", name: "Claude",
    models: [
      { id: "claude-sonnet-4-6", name: "Sonnet 4" },
      { id: "claude-haiku-4-5-20250414", name: "Haiku 4.5" },
      { id: "claude-opus-4-20250514", name: "Opus 4" },
    ],
  },
  {
    id: "openai", name: "OpenAI",
    models: [
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini" },
      { id: "gpt-4.1", name: "GPT-4.1" },
    ],
  },
  {
    id: "google", name: "Gemini",
    models: [
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    ],
  },
  {
    id: "mistral", name: "Mistral",
    models: [
      { id: "mistral-large-latest", name: "Mistral Large" },
      { id: "mistral-small-latest", name: "Mistral Small" },
    ],
  },
  {
    id: "grok", name: "Grok",
    models: [
      { id: "grok-3", name: "Grok 3" },
      { id: "grok-3-mini", name: "Grok 3 Mini" },
    ],
  },
  {
    id: "deepseek", name: "DeepSeek",
    models: [
      { id: "deepseek-chat", name: "DeepSeek V3" },
      { id: "deepseek-reasoner", name: "DeepSeek R1" },
    ],
  },
  {
    id: "mimo", name: "MiMo",
    models: [
      { id: "MiMo-V2-Flash", name: "MiMo V2 Flash" },
      { id: "MiMo-V2-Omni", name: "MiMo V2 Omni" },
    ],
  },
  {
    id: "llama", name: "Llama",
    models: [
      { id: "llama-4-maverick", name: "Maverick" },
      { id: "llama-4-scout", name: "Scout" },
    ],
  },
  {
    id: "cohere", name: "Cohere",
    models: [
      { id: "command-a", name: "Command A" },
      { id: "command-r-plus", name: "Command R+" },
    ],
  },
  {
    id: "fireworks", name: "Fireworks",
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

export default function SettingsPage() {
  const [pttKey, setPttKey] = useState(" ");
  const [binding, setBinding] = useState(false);

  const [sttProvider, setSttProvider] = useState(0);
  const [sttApiKey, setSttApiKey] = useState("");

  const [aiProvider, setAiProvider] = useState(0);
  const [aiModel, setAiModel] = useState(0);
  const [aiApiKey, setAiApiKey] = useState("");

  const [saved, setSaved] = useState(false);

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
      const idx = AI_PROVIDERS[AI_PROVIDERS.findIndex(p => p.id === (localStorage.getItem("vox-ai-provider") || "anthropic"))].models.findIndex(m => m.id === am);
      if (idx >= 0) setAiModel(idx);
    }
    const ak = localStorage.getItem("vox-ai-apikey");
    if (ak) setAiApiKey(ak);
  }, []);

  useEffect(() => {
    if (!binding) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setBinding(false); return; }
      if (MODIFIER_KEYS.has(e.key)) return;
      setPttKey(e.key);
      localStorage.setItem("vox-ptt-key", e.key);
      setBinding(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [binding]);

  function saveAll() {
    localStorage.setItem("vox-ptt-key", pttKey);
    localStorage.setItem("vox-stt-provider", STT_PROVIDERS[sttProvider].id);
    localStorage.setItem("vox-stt-apikey", sttApiKey);
    localStorage.setItem("vox-ai-provider", AI_PROVIDERS[aiProvider].id);
    localStorage.setItem("vox-ai-model", AI_PROVIDERS[aiProvider].models[aiModel].id);
    localStorage.setItem("vox-ai-apikey", aiApiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const inputCls = "w-full bg-white/[0.04] text-sm text-white/70 px-3 py-2.5 rounded-lg outline-none border border-white/[0.06] focus:border-white/20 transition-colors placeholder:text-white/15";
  const selectCls = "w-full bg-white/[0.04] text-sm text-white/70 px-3 py-2.5 rounded-lg outline-none border border-white/[0.06] focus:border-white/20 transition-colors cursor-pointer";
  const labelCls = "text-[11px] text-white/30 uppercase tracking-wider mb-2 block";

  return (
    <div className="min-h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-white/20 hover:text-white/50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <h1 className="text-xs font-medium tracking-[0.2em] text-white/30 uppercase">settings</h1>
        </div>
        <button
          onClick={saveAll}
          className={`text-xs px-4 py-1.5 rounded-lg transition-all ${
            saved ? "bg-green-500/20 text-green-400/80" : "bg-white/[0.06] text-white/40 hover:text-white/60 hover:bg-white/10"
          }`}
        >
          {saved ? "saved" : "save"}
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-6 py-8 max-w-lg mx-auto w-full">
        <div className="space-y-10">

          {/* Push-to-Talk */}
          <section>
            <label className={labelCls}>Push-to-Talk Key</label>
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/60 font-mono bg-white/[0.04] px-4 py-2.5 rounded-lg border border-white/[0.06]">
                {keyLabel(pttKey)}
              </span>
              <button
                onClick={() => setBinding(true)}
                className="text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                change
              </button>
            </div>
          </section>

          {/* Transcription */}
          <section>
            <label className={labelCls}>Transcription Provider</label>
            <select
              value={sttProvider}
              onChange={e => setSttProvider(Number(e.target.value))}
              className={selectCls}
            >
              {STT_PROVIDERS.map((p, i) => (
                <option key={p.id} value={i} className="bg-[#111]">{p.name}</option>
              ))}
            </select>

            <label className={`${labelCls} mt-4`}>Transcription API Key</label>
            <input
              type="password"
              value={sttApiKey}
              onChange={e => setSttApiKey(e.target.value)}
              placeholder="sk-..."
              className={inputCls}
            />
            <p className="text-[10px] text-white/15 mt-1.5">
              {STT_PROVIDERS[sttProvider].id === "openai" && "Get key at platform.openai.com/api-keys"}
              {STT_PROVIDERS[sttProvider].id === "groq" && "Get key at console.groq.com/keys"}
              {STT_PROVIDERS[sttProvider].id === "deepgram" && "Get key at console.deepgram.com"}
            </p>
          </section>

          {/* AI Cleanup */}
          <section>
            <label className={labelCls}>AI Cleanup Provider</label>
            <select
              value={aiProvider}
              onChange={e => { setAiProvider(Number(e.target.value)); setAiModel(0); }}
              className={selectCls}
            >
              {AI_PROVIDERS.map((p, i) => (
                <option key={p.id} value={i} className="bg-[#111]">{p.name}</option>
              ))}
            </select>

            <label className={`${labelCls} mt-4`}>Model</label>
            <select
              value={aiModel}
              onChange={e => setAiModel(Number(e.target.value))}
              className={selectCls}
            >
              {AI_PROVIDERS[aiProvider].models.map((m, i) => (
                <option key={m.id} value={i} className="bg-[#111]">{m.name}</option>
              ))}
            </select>

            <label className={`${labelCls} mt-4`}>AI API Key</label>
            <input
              type="password"
              value={aiApiKey}
              onChange={e => setAiApiKey(e.target.value)}
              placeholder="sk-..."
              className={inputCls}
            />
            <p className="text-[10px] text-white/15 mt-1.5">
              {AI_PROVIDERS[aiProvider].id === "anthropic" && "Get key at console.anthropic.com"}
              {AI_PROVIDERS[aiProvider].id === "openai" && "Get key at platform.openai.com/api-keys"}
              {AI_PROVIDERS[aiProvider].id === "google" && "Get key at aistudio.google.com/apikey"}
              {AI_PROVIDERS[aiProvider].id === "mistral" && "Get key at console.mistral.ai"}
              {AI_PROVIDERS[aiProvider].id === "grok" && "Get key at console.x.ai"}
              {AI_PROVIDERS[aiProvider].id === "deepseek" && "Get key at platform.deepseek.com"}
              {AI_PROVIDERS[aiProvider].id === "mimo" && "Get key at your MiMo provider dashboard"}
              {AI_PROVIDERS[aiProvider].id === "llama" && "Get key at api.together.xyz"}
              {AI_PROVIDERS[aiProvider].id === "cohere" && "Get key at dashboard.cohere.com"}
              {AI_PROVIDERS[aiProvider].id === "fireworks" && "Get key at fireworks.ai"}
            </p>
          </section>

        </div>
      </main>

      {/* Binding overlay */}
      {binding && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
          <div className="text-center">
            <p className="text-white/50 text-lg font-light">press any key</p>
            <p className="text-white/20 text-xs mt-3">escape to cancel</p>
          </div>
        </div>
      )}
    </div>
  );
}
