import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, signToken } from "../middleware/auth";
import { authRateLimiter } from "../middleware/rateLimit";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  designation: z.string().optional(),
  companyName: z.string().optional(),
  companyAbout: z.string().optional(),
  businessType: z.string().optional(),
});

authRouter.post("/login", authRateLimiter, async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken({ userId: user.id, role: user.role });
    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    return next(err);
  }
});

authRouter.post("/register", async (req, res, next) => {
  try {
    const parsed = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: parsed.email } });
    if (existing) {
      return res.status(409).json({ error: "User with this email already exists" });
    }

    const lowerDesignation = (parsed.designation ?? "").toLowerCase();
    let role: "ADMIN" | "CEO" | "CFO" | "SALES_HEAD" | "OPERATIONS_HEAD" = "ADMIN";
    if (lowerDesignation.includes("ceo") || lowerDesignation.includes("founder")) role = "CEO";
    else if (lowerDesignation.includes("cfo") || lowerDesignation.includes("finance")) role = "CFO";
    else if (lowerDesignation.includes("sales")) role = "SALES_HEAD";
    else if (lowerDesignation.includes("ops") || lowerDesignation.includes("operation"))
      role = "OPERATIONS_HEAD";

    const hash = await bcrypt.hash(parsed.password, 10);

    const user = await prisma.user.create({
      data: {
        email: parsed.email,
        name: parsed.name,
        password: hash,
        role,
        designation: parsed.designation ?? null,
        companyName: parsed.companyName ?? null,
        companyAbout: parsed.companyAbout ?? null,
        businessType: parsed.businessType ?? null,
      },
    });

    const token = signToken({ userId: user.id, role: user.role });
    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    return next(err);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (err) {
    return next(err);
  }
});

