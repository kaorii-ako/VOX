"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type State = "IDLE" | "RECORDING" | "THINKING" | "RESPONDING" | "BINDING";

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
  const [state, setState] = useState<State>("IDLE");
  const [pttKey, setPttKey] = useState(" ");
  const [response, setResponse] = useState("");
  const [showKeyBtn, setShowKeyBtn] = useState(false);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const responseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("vox-ptt-key");
    if (saved !== null) setPttKey(saved);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      chunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        if (blob.size === 0) {
          setState("IDLE");
          return;
        }
        setState("THINKING");
        try {
          const form = new FormData();
          form.append("audio", blob, "recording.webm");
          const tRes = await fetch("/api/transcribe", { method: "POST", body: form });
          const { transcript } = await tRes.json();
          if (!transcript) {
            setState("IDLE");
            return;
          }

          const cRes = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: transcript }),
          });

          if (!cRes.ok || !cRes.body) {
            setState("IDLE");
            return;
          }

          setResponse("");
          setState("RESPONDING");

          const reader = cRes.body.getReader();
          const decoder = new TextDecoder();
          let text = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            text += decoder.decode(value, { stream: true });
            setResponse(text);
          }

          fadeTimer.current = setTimeout(() => {
            setResponse("");
            setState("IDLE");
          }, 8000);
        } catch {
          setState("IDLE");
        }
      };

      mediaRecorder.current = recorder;
      recorder.start();
      setState("RECORDING");
    } catch {
      setState("IDLE");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
      mediaRecorder.current.stop();
    }
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (state === "BINDING") {
        if (e.key === "Escape") {
          setState("IDLE");
          return;
        }
        if (MODIFIER_KEYS.has(e.key)) return;
        setPttKey(e.key);
        localStorage.setItem("vox-ptt-key", e.key);
        setState("IDLE");
        return;
      }
      if (e.key === pttKey && state === "IDLE") {
        e.preventDefault();
        if (fadeTimer.current) clearTimeout(fadeTimer.current);
        if (responseTimer.current) clearTimeout(responseTimer.current);
        setResponse("");
        startRecording();
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.key === pttKey && state === "RECORDING") {
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
  }, [pttKey, state, startRecording, stopRecording]);

  // Mobile touch fallback
  function onTouchStart(e: React.TouchEvent) {
    if (state === "IDLE") {
      e.preventDefault();
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      setResponse("");
      startRecording();
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (state === "RECORDING") {
      e.preventDefault();
      stopRecording();
    }
  }

  function enterBinding() {
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    if (responseTimer.current) clearTimeout(responseTimer.current);
    setResponse("");
    setState("BINDING");
  }

  return (
    <div
      className="h-full flex flex-col items-center justify-center select-none relative"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseEnter={() => setShowKeyBtn(true)}
      onMouseLeave={() => setShowKeyBtn(false)}
    >
      {/* IDLE */}
      {state === "IDLE" && (
        <div className="text-center">
          <p className="text-5xl font-light tracking-tight">
            hold{" "}
            <span className="font-semibold text-white/90">
              {keyDisplayName(pttKey)}
            </span>
          </p>
        </div>
      )}

      {/* RECORDING */}
      {state === "RECORDING" && (
        <div className="flex flex-col items-center gap-6">
          <div className="w-5 h-5 rounded-full bg-red-500 animate-pulse" />
          <p className="text-3xl font-light text-white/70">listening...</p>
        </div>
      )}

      {/* THINKING */}
      {state === "THINKING" && (
        <div className="flex items-center gap-2">
          <span className="text-3xl font-light text-white/50 animate-pulse">
            ...
          </span>
        </div>
      )}

      {/* RESPONDING */}
      {state === "RESPONDING" && (
        <div className="max-w-2xl px-8 text-center">
          <p className="text-3xl font-light leading-relaxed text-white/90">
            {response}
          </p>
        </div>
      )}

      {/* BINDING overlay */}
      {state === "BINDING" && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50">
          <p className="text-4xl font-light text-white/70">
            press any key...
          </p>
        </div>
      )}

      {/* Change key button */}
      <button
        onClick={enterBinding}
        className={`fixed bottom-6 right-6 px-3 py-1.5 text-sm text-white/30 hover:text-white/60 transition-opacity duration-300 ${
          showKeyBtn ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        change key
      </button>
    </div>
  );
}
