"use client";

import { motion } from "framer-motion";

const GREETING = "Hi 👋 I'm ZII BOT. Want to see how we can increase your revenue?";

interface ZiiBotAvatarProps {
  isIdle?: boolean;
  isTyping?: boolean;
  size?: "button" | "panel" | "fullscreen";
  className?: string;
}

export function ZiiBotAvatar({ isIdle = true, isTyping = false, size = "button", className = "" }: ZiiBotAvatarProps) {
  const scale = size === "button" ? 1 : size === "panel" ? 1.2 : 1.5;
  const s = (n: number) => n * scale;

  return (
    <motion.div
      className={`zii-avatar-wrap ${className}`}
      style={{ width: s(48), height: s(48), position: "relative" }}
      animate={
        isTyping
          ? { scale: [1, 1.05, 1], transition: { repeat: Infinity, duration: 0.8 } }
          : isIdle
          ? { scale: [1, 1.03, 1], transition: { repeat: Infinity, duration: 2.5, ease: "easeInOut" } }
          : {}
      }
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: "visible" }}
      >
        {/* Soft glow behind head */}
        <defs>
          <linearGradient id="zii-head-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
          <linearGradient id="zii-cheek" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.2" />
          </linearGradient>
          <filter id="zii-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Head / body blob - rounded mascot shape */}
        <motion.ellipse
          cx="32"
          cy="36"
          rx="26"
          ry="24"
          fill="url(#zii-head-grad)"
          filter="url(#zii-glow)"
          animate={
            isIdle && !isTyping
              ? { rx: [26, 27, 26], ry: [24, 25, 24], transition: { repeat: Infinity, duration: 2.2, ease: "easeInOut" } }
              : isTyping
              ? { rx: [26, 28, 26], ry: [24, 22, 24], transition: { repeat: Infinity, duration: 0.5 } }
              : {}
          }
        />
        {/* Left cheek */}
        <ellipse cx="22" cy="38" rx="6" ry="5" fill="url(#zii-cheek)" opacity="0.9" />
        {/* Right cheek */}
        <ellipse cx="42" cy="38" rx="6" ry="5" fill="url(#zii-cheek)" opacity="0.9" />
        {/* Eyes */}
        <motion.g>
          <motion.ellipse
            cx="26"
            cy="32"
            rx="4"
            ry="5"
            fill="#1e1b4b"
            animate={
              isIdle && !isTyping
                ? { ry: [5, 0.8, 5], transition: { repeat: Infinity, repeatDelay: 2.5, duration: 0.12 } }
                : isTyping
                ? { ry: [5, 2, 5], transition: { repeat: Infinity, duration: 0.25 } }
                : {}
            }
          />
          <motion.ellipse
            cx="38"
            cy="32"
            rx="4"
            ry="5"
            fill="#1e1b4b"
            animate={
              isIdle && !isTyping
                ? { ry: [5, 0.8, 5], transition: { repeat: Infinity, repeatDelay: 2.5, duration: 0.12 } }
                : isTyping
                ? { ry: [5, 2, 5], transition: { repeat: Infinity, duration: 0.25 } }
                : {}
            }
          />
        </motion.g>
        {/* Mouth - subtle smile / talk */}
        <motion.path
          d={isTyping ? "M 24 42 Q 32 46 40 42" : "M 24 42 Q 32 44 40 42"}
          stroke="#1e1b4b"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          animate={
            isTyping
              ? { d: ["M 24 42 Q 32 46 40 42", "M 24 43 Q 32 41 40 43", "M 24 42 Q 32 46 40 42"], transition: { repeat: Infinity, duration: 0.4 } }
              : {}
          }
        />
        {/* Small highlight on head for 3D feel */}
        <ellipse cx="28" cy="26" rx="6" ry="4" fill="white" opacity="0.35" />
      </svg>
    </motion.div>
  );
}

export const ZII_GREETING = GREETING;
