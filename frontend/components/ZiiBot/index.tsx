"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ZiiBotAvatar } from "./ZiiBotAvatar";
import { ZiiBotPanel } from "./ZiiBotPanel";
import { useZiiBotChat } from "./useZiiBotChat";

function useDarkMode(): boolean {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const fn = () => setDark(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return dark;
}

export function ZiiBot() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [closing, setClosing] = useState(false);
  const darkMode = useDarkMode();
  const chat = useZiiBotChat();

  useEffect(() => {
    if (fullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [fullscreen]);

  const openPanel = useCallback(() => {
    setClosing(false);
    setPanelOpen(true);
    setFullscreen(false);
  }, []);

  const closePanel = useCallback(() => {
    if (fullscreen) {
      setFullscreen(false);
      setPanelOpen(false);
      setClosing(false);
      return;
    }
    setPanelOpen(false);
    setClosing(true);
    const t = setTimeout(() => setClosing(false), 320);
    return () => clearTimeout(t);
  }, [fullscreen]);

  const toggleFullscreen = useCallback(() => setFullscreen((f) => !f), []);

  const showPanel = panelOpen || fullscreen || closing;

  return (
    <>
      <AnimatePresence mode="wait">
        {fullscreen ? (
          <ZiiBotPanel
            key="fullscreen"
            isOpen
            onClose={closePanel}
            isFullscreen
            onToggleFullscreen={toggleFullscreen}
            messages={chat.messages}
            isTyping={chat.isTyping}
            onSend={chat.sendMessage}
            soundOn={chat.soundOn}
            onToggleSound={chat.toggleSound}
            showGreeting={chat.showGreeting}
            darkMode={darkMode}
          />
        ) : showPanel ? (
          <ZiiBotPanel
            key="slide"
            isOpen={panelOpen}
            onClose={closePanel}
            isFullscreen={false}
            onToggleFullscreen={toggleFullscreen}
            messages={chat.messages}
            isTyping={chat.isTyping}
            onSend={chat.sendMessage}
            soundOn={chat.soundOn}
            onToggleSound={chat.toggleSound}
            showGreeting={chat.showGreeting}
            darkMode={darkMode}
          />
        ) : null}
      </AnimatePresence>

      {!fullscreen && (
        <motion.button
          type="button"
          className="zii-fab"
          onClick={panelOpen || closing ? closePanel : openPanel}
          aria-label={panelOpen || closing ? "Close chat" : "Open ZII BOT"}
          initial={false}
          animate={{
            scale: 1,
            boxShadow: [
              "0 4px 24px rgba(99, 102, 241, 0.35), 0 0 0 0 rgba(99, 102, 241, 0.4)",
              "0 4px 28px rgba(99, 102, 241, 0.45), 0 0 0 8px rgba(99, 102, 241, 0)",
              "0 4px 24px rgba(99, 102, 241, 0.35), 0 0 0 0 rgba(99, 102, 241, 0.4)",
            ],
          }}
          transition={{
            boxShadow: { repeat: Infinity, duration: 2.2, ease: "easeInOut" },
          }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.96 }}
        >
          <ZiiBotAvatar isIdle={!chat.isTyping} isTyping={chat.isTyping} size="button" />
        </motion.button>
      )}

      {fullscreen && (
        <motion.button
          type="button"
          className="zii-fab zii-fab-close-fullscreen"
          onClick={closePanel}
          aria-label="Close chat"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </motion.button>
      )}
    </>
  );
}
