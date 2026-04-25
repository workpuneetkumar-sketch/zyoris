import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { getActiveProvider, ZII_SYSTEM, getFallbackReply } from "../services/aiProviderService";
import type { ChatMessage } from "../services/aiProviderService";

export const chatRouter = Router();

chatRouter.post("/session", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { title } = req.body as { title?: string };

    const session = await prisma.chatSession.create({
      data: {
        userId,
        title: title ?? "New Chat",
      },
    });

    return res.status(201).json(session);
  } catch (err) {
    return next(err);
  }
});

chatRouter.get("/sessions", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;

    const sessions = await prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    });

    return res.json(sessions);
  } catch (err) {
    return next(err);
  }
});

chatRouter.get("/session/:sessionId", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { sessionId } = req.params;

    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    return res.json(session);
  } catch (err) {
    return next(err);
  }
});

chatRouter.post("/message", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { sessionId, message } = req.body as {
      sessionId: string;
      message: string;
    };

    if (!sessionId || !message?.trim()) {
      return res.status(400).json({ error: "sessionId and message are required" });
    }

    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    await prisma.chatMessage.create({
      data: {
        sessionId,
        role: "user",
        content: message.trim(),
      },
    });

    const history = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });

    const messages: ChatMessage[] = history.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    let reply = "";
    let providerName = "fallback";
    let modelName: string | null = null;

    try {
      const provider = getActiveProvider();
      providerName = provider.name;
      reply = await provider.chat(messages, ZII_SYSTEM);
    } catch (err) {
      providerName = "fallback";
      reply = getFallbackReply(messages);
    }

    const assistantMessage = await prisma.chatMessage.create({
      data: {
        sessionId,
        role: "assistant",
        content: reply,
        provider: providerName,
        model: modelName,
      },
    });

    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    return res.json({
      message: assistantMessage,
      reply,
    });
  } catch (err) {
    return next(err);
  }
});

chatRouter.delete("/session/:sessionId", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { sessionId } = req.params;

    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    await prisma.chatMessage.deleteMany({ where: { sessionId } });
    await prisma.chatSession.delete({ where: { id: sessionId } });

    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
});