"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ZiiBotAvatar } from "./ZiiBotAvatar";
import { ZII_GREETING } from "./ZiiBotAvatar";
import type { ChatMessage } from "./useZiiBotChat";

interface ZiiBotPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  messages: ChatMessage[];
  isTyping: boolean;
  onSend: (text: string) => void;
  soundOn: boolean;
  onToggleSound: () => void;
  showGreeting: boolean;
  darkMode: boolean;
}

export function ZiiBotPanel({
  isOpen,
  onClose,
  isFullscreen,
  onToggleFullscreen,
  messages,
  isTyping,
  onSend,
  soundOn,
  onToggleSound,
  showGreeting,
  darkMode,
}: ZiiBotPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = inputRef.current;
    if (!input) return;
    const v = input.value.trim();
    if (v) {
      onSend(v);
      input.value = "";
    }
  };

  const panelContent = (
    <>
      <div className="zii-panel-header">
        <div className="zii-panel-header-left">
          <ZiiBotAvatar isIdle={!isTyping} isTyping={isTyping} size="panel" />
          <div>
            <span className="zii-panel-title">ZII BOT</span>
            <span className="zii-panel-subtitle">Intelligent Performance Assistant</span>
          </div>
        </div>
        <div className="zii-panel-header-actions">
          <button
            type="button"
            className="zii-icon-btn"
            onClick={onToggleSound}
            title={soundOn ? "Mute sound" : "Enable sound"}
            aria-label={soundOn ? "Mute sound" : "Enable sound"}
          >
            {soundOn ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            )}
          </button>
          <button
            type="button"
            className="zii-icon-btn"
            onClick={onToggleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            )}
          </button>
          <button
            type="button"
            className="zii-icon-btn"
            onClick={onClose}
            title="Close"
            aria-label="Close chat"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="zii-panel-messages" ref={scrollRef}>
        {showGreeting && (
          <motion.div
            className="zii-message zii-message-bot"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="zii-message-avatar">
              <ZiiBotAvatar isIdle={false} isTyping={false} size="button" />
            </div>
            <div className="zii-bubble zii-bubble-bot">
              <p>{ZII_GREETING}</p>
            </div>
          </motion.div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              className={`zii-message ${msg.role === "user" ? "zii-message-user" : "zii-message-bot"}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {msg.role === "assistant" && (
                <div className="zii-message-avatar">
                  <ZiiBotAvatar isIdle={false} isTyping={false} size="button" />
                </div>
              )}
              <div className={`zii-bubble ${msg.role === "user" ? "zii-bubble-user" : "zii-bubble-bot"}`}>
                <p>{msg.content}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isTyping && (
          <motion.div
            className="zii-message zii-message-bot"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="zii-message-avatar">
              <ZiiBotAvatar isIdle={false} isTyping size="button" />
            </div>
            <div className="zii-bubble zii-bubble-bot zii-typing">
              <div className="zii-typing-dots">
                <span />
                <span />
                <span />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <form className="zii-panel-input-wrap" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          className="zii-panel-input"
          placeholder="Ask about revenue, sales, or how Zyoris can help..."
          disabled={isTyping}
          maxLength={2000}
        />
        <button type="submit" className="zii-send-btn" disabled={isTyping} aria-label="Send">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </>
  );

  if (isFullscreen) {
    return (
      <motion.div
        className="zii-panel zii-panel-fullscreen"
        data-dark={darkMode}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="zii-panel-inner-fullscreen">{panelContent}</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="zii-panel zii-panel-slide"
      data-dark={darkMode}
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: isOpen ? 0 : 400, opacity: isOpen ? 1 : 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
    >
      <div className="zii-panel-inner">{panelContent}</div>
    </motion.div>
  );
}
