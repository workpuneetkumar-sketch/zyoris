import { NextRequest, NextResponse } from "next/server";

const ZII_SYSTEM = `You are ZII BOT, the intelligent performance assistant for Zyoris — an autonomous business intelligence platform (Central Intelligence Layer v3).

Personality: Friendly, intelligent, confident, slightly playful. You are an expert in sales strategy, revenue analytics, SaaS growth, and business intelligence. Be structured, provide value, and be persuasive but not pushy.

When asked "What do you do?" — Explain that Zyoris is a central intelligence platform that unifies data from CRM, ERP, accounting, marketing, and inventory. It gives leaders a single view of revenue, margin, demand signals, and AI-driven recommendations so they can make faster, data-backed decisions.

When asked "How can this help my business?" — Explain that Zyoris helps increase revenue by surfacing growth opportunities, identifying underperformers, improving pipeline visibility, and recommending where to invest (e.g. marketing ROI, pricing, inventory). Keep the answer strategic and concise (2–4 sentences).

Always respond in clean, professional business English. No raw technical jargon. Write like a senior consultant.`;

function normalizeMessage(m: string): string {
  return m.trim().toLowerCase().replace(/\s+/g, " ");
}

function getFallbackReply(messages: { role: string; content: string }[]): string {
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") {
    return "Hi 👋 I'm ZII BOT. Ask me how Zyoris can help increase your revenue, or what the platform does.";
  }
  const text = normalizeMessage(last.content);
  if (
    text.includes("what do you do") ||
    text.includes("what are you") ||
    text === "who are you" ||
    text.includes("introduce")
  ) {
    return "Zyoris is your Central Intelligence Layer — we unify data from CRM, ERP, accounting, marketing, and inventory into one place. Leaders get a single view of revenue, margins, demand signals, and AI-driven recommendations so you can make faster, data-backed decisions. Think of me as your on-demand analyst for growth and performance.";
  }
  if (
    text.includes("how can this help") ||
    text.includes("how can you help") ||
    text.includes("help my business") ||
    text.includes("increase revenue") ||
    text.includes("grow revenue")
  ) {
    return "Zyoris helps you increase revenue by surfacing where to grow: which products and segments perform best, where your pipeline is leaking, and where to invest next (e.g. marketing ROI, pricing, inventory). You get clear recommendations and risk signals instead of spreadsheets — so you can act quickly and with confidence.";
  }
  if (text.includes("sales") || text.includes("pipeline") || text.includes("deals")) {
    return "On the sales side, Zyoris connects your pipeline and deals with revenue and forecasting. You’ll see which segments and products drive revenue, where deals get stuck, and how to prioritise. I can help you think through strategy — just ask something specific like “How do I improve win rates?” or “Where should we focus next?”";
  }
  if (text.includes("marketing") || text.includes("roi") || text.includes("campaign")) {
    return "For marketing, the platform ties spend to outcomes so you can see which channels and campaigns actually drive revenue. We help you shift budget to what works and cut what doesn’t — so you get more growth from the same (or less) spend.";
  }
  if (text.includes("price") || text.includes("pricing") || text.includes("rate")) {
    return "Pricing and rate-card intelligence is part of the picture too. Zyoris can analyse your pricing data alongside revenue and margin so you can spot opportunities to optimise by product, segment, or region. Want to go deeper on a specific area?";
  }
  if (text.includes("hi") || text.includes("hello") || text.includes("hey")) {
    return "Hi 👋 I'm ZII BOT. Want to see how we can increase your revenue? Ask me what Zyoris does or how it can help your business.";
  }
  if (text.includes("thank")) {
    return "You're welcome! If you’d like to dig into revenue, sales, or marketing strategy, just ask.";
  }
  return "I’m here to help with sales strategy, revenue analytics, and how Zyoris can support your growth. Try asking: “What do you do?” or “How can this help my business?” and I’ll give you a clear, strategic answer.";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages = [], sessionId } = body as { messages?: { role: string; content: string }[]; sessionId?: string };
    const apiKey = process.env.OPENAI_API_KEY;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages array required" }, { status: 400 });
    }

    if (apiKey) {
      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: ZII_SYSTEM },
            ...messages.map((m: { role: string; content: string }) => ({
              role: m.role === "assistant" ? "assistant" : "user",
              content: m.content,
            })),
          ],
          max_tokens: 400,
          temperature: 0.7,
        }),
      });

      if (!openaiRes.ok) {
        const err = await openaiRes.text();
        console.error("OpenAI error:", err);
        const fallback = getFallbackReply(messages);
        return NextResponse.json({ message: fallback });
      }

      const data = (await openaiRes.json()) as { choices?: { message?: { content?: string } }[] };
      const content = data.choices?.[0]?.message?.content?.trim() || getFallbackReply(messages);
      return NextResponse.json({ message: content });
    }

    const reply = getFallbackReply(messages);
    return NextResponse.json({ message: reply });
  } catch (e) {
    console.error("Chat API error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
