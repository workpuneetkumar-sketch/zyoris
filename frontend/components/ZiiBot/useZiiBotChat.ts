"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ZII_GREETING } from "./ZiiBotAvatar";

const SESSION_KEY = "zii-bot-session";
const HISTORY_KEY = "zii-bot-history";
const SOUND_KEY = "zii-bot-sound";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let s = sessionStorage.getItem(SESSION_KEY);
  if (!s) {
    s = `zii-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    sessionStorage.setItem(SESSION_KEY, s);
  }
  return s;
}

function loadHistory(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) ? parsed.slice(-50) : [];
  } catch {
    return [];
  }
}

function saveHistory(messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-50)));
  } catch {
    //
  }
}

export function getSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(SOUND_KEY);
  return v !== "false";
}

export function setSoundEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SOUND_KEY, enabled ? "true" : "false");
}

function playNotificationSound() {
  if (!getSoundEnabled() || typeof window === "undefined") return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    //
  }
}

export function useZiiBotChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadHistory());
  const [isTyping, setIsTyping] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const sessionIdRef = useRef<string>("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    sessionIdRef.current = getSessionId();
  }, []);

  useEffect(() => {
    setSoundOn(getSoundEnabled());
  }, []);

  useEffect(() => {
    if (messages.length > 0) saveHistory(messages);
  }, [messages]);

  const sendMessage = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isTyping) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current || getSessionId(),
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: (abortRef.current = new AbortController()).signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Something went wrong");
      }

      const data = (await res.json()) as { message?: string; text?: string };
      const assistantText = data.message ?? data.text ?? "I’m here to help. Try asking how Zyoris can increase your revenue or improve your sales strategy.";
      playNotificationSound();
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: assistantText,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      const errMsg = (e as Error).message || "Could not get a response. Please try again.";
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: errMsg,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsTyping(false);
      abortRef.current = null;
    }
  }, [messages, isTyping]);

  const toggleSound = useCallback(() => {
    const next = !getSoundEnabled();
    setSoundEnabled(next);
    setSoundOn(next);
  }, []);

  const showGreeting = messages.length === 0;
  return {
    messages,
    sendMessage,
    isTyping,
    soundOn,
    toggleSound,
    showGreeting,
  };
}
