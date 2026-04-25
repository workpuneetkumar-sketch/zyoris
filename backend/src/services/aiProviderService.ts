export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIProvider {
  name: string;
  chat(messages: ChatMessage[], systemPrompt: string): Promise<string>;
}

const ZII_SYSTEM = `You are ZII BOT, the intelligent performance assistant for Zyoris — an autonomous business intelligence platform (Central Intelligence Layer v3).

Personality: Friendly, intelligent, confident, slightly playful. You are an expert in sales strategy, revenue analytics, SaaS growth, and business intelligence. Be structured, provide value, and be persuasive but not pushy.

When asked "What do you do?" — Explain that Zyoris is a central intelligence platform that unifies data from CRM, ERP, accounting, marketing, and inventory. It gives leaders a single view of revenue, margin, demand signals, and AI-driven recommendations so they can make faster, data-backed decisions.

Always respond in clean, professional business English. No raw technical jargon. Write like a senior consultant.`;

// ─── OpenAI Provider ──────
class OpenAIProvider implements AIProvider {
  name = "openai";

  async chat(messages: ChatMessage[], systemPrompt: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI error: ${err}`);
    }

    const data = await res.json() as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content?.trim() ?? "";
  }
}

// ─── Claude Provider ────────
class ClaudeProvider implements AIProvider {
  name = "claude";

  async chat(messages: ChatMessage[], systemPrompt: string): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL ?? "claude-3-haiku-20240307",
        system: systemPrompt,
        messages,
        max_tokens: 400,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Claude error: ${err}`);
    }

    const data = await res.json() as {
      content?: { type: string; text: string }[];
    };
    return data.content?.[0]?.text?.trim() ?? "";
  }
}

// ─── Gemini Provider ────────
class GeminiProvider implements AIProvider {
  name = "gemini";

  async chat(messages: ChatMessage[], systemPrompt: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not set");

    const model = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini error: ${err}`);
    }

    const data = await res.json() as {
      candidates?: { content?: { parts?: { text: string }[] } }[];
    };
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  }
}

// ─── Fallback ────────
function getFallbackReply(messages: ChatMessage[]): string {
  const last = messages[messages.length - 1];
  if (!last) return "Hi 👋 I'm ZII BOT. Ask me how Zyoris can help your business.";
  const text = last.content.trim().toLowerCase();

  if (text.includes("what do you do") || text.includes("who are you")) {
    return "Zyoris is your Central Intelligence Layer — we unify data from CRM, ERP, accounting, marketing, and inventory into one place. Leaders get a single view of revenue, margins, demand signals, and AI-driven recommendations.";
  }
  if (text.includes("help my business") || text.includes("increase revenue")) {
    return "Zyoris helps you increase revenue by surfacing where to grow: which products and segments perform best, where your pipeline is leaking, and where to invest next.";
  }
  if (text.includes("hi") || text.includes("hello") || text.includes("hey")) {
    return "Hi 👋 I'm ZII BOT. Want to see how we can increase your revenue? Ask me what Zyoris does or how it can help your business.";
  }
  return "I'm here to help with sales strategy, revenue analytics, and how Zyoris can support your growth. Try asking: 'What do you do?' or 'How can this help my business?'";
}

// ─── Factory ────────
export function getActiveProvider(): AIProvider {
  const provider = (process.env.AI_PROVIDER ?? "openai").toLowerCase();
  if (provider === "claude") return new ClaudeProvider();
  if (provider === "gemini") return new GeminiProvider();
  return new OpenAIProvider();
}

export { ZII_SYSTEM, getFallbackReply };