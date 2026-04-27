import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import {
  hashToken,
  requireAuth,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../middleware/auth";
import { authRateLimiter } from "../middleware/rateLimit";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z
    .enum(["ADMIN", "CEO", "CFO", "SALES_HEAD", "OPERATIONS_HEAD", "USER", "MANAGER", "SALES_USER"])
    .optional()
    .default("USER"),
  organizationId: z.string().min(1).optional(),
  designation: z.string().optional(),
  companyName: z.string().optional(),
  companyAbout: z.string().optional(),
  businessType: z.string().optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

function buildAuthResponse(user: {
  id: string;
  email: string;
  name: string;
  role: { name: string };
  organizationId: string | null;
  organization?: { id: string; name: string; slug: string } | null;
}) {
  const payload = {
    userId: user.id,
    role: user.role.name,
    organizationId: user.organizationId,
  };

  const accessToken = signAccessToken(payload);
  const { token: refreshToken, hash } = signRefreshToken(payload);

  return {
    accessToken,
    refreshToken,
    refreshTokenHash: hash,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
      organizationId: user.organizationId,
      organizationName: user.organization?.name ?? null,
      organizationSlug: user.organization?.slug ?? null,
    },
  };
}

authRouter.post("/login", authRateLimiter, async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true, organization: true },
    });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const response = buildAuthResponse(user);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId,
        tokenHash: response.refreshTokenHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return res.json({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      user: response.user,
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

    const roleName = parsed.role ?? "USER";
    const roleRecord = await prisma.role.findUnique({ where: { name: roleName } });
    if (!roleRecord) {
      return res.status(500).json({ error: "Role not found" });
    }

    let organization = null;
    if (parsed.organizationId) {
      organization = await prisma.organization.findFirst({
        where: { id: parsed.organizationId, isActive: true },
      });
      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }
    }

    const hash = await bcrypt.hash(parsed.password, 10);

    const user = await prisma.$transaction(async (transaction) => {
      const createdUser = await transaction.user.create({
        data: {
          email: parsed.email,
          name: parsed.name,
          password: hash,
          roleId: roleRecord.id,
          organizationId: organization?.id ?? null,
          designation: parsed.designation ?? null,
          companyName: parsed.companyName ?? null,
          companyAbout: parsed.companyAbout ?? null,
          businessType: parsed.businessType ?? null,
        },
        include: {
          role: true,
          organization: true,
        },
      });

      if (organization) {
        await transaction.organizationMembership.create({
          data: {
            organizationId: organization.id,
            userId: createdUser.id,
            roleId: roleRecord.id,
          },
        });
      }

      return createdUser;
    });

    const response = buildAuthResponse(user);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId,
        tokenHash: response.refreshTokenHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return res.status(201).json({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      user: response.user,
    });
  } catch (err) {
    return next(err);
  }
});

authRouter.post("/refresh", authRateLimiter, async (req, res, next) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const payload = verifyRefreshToken(refreshToken);

    if (payload.tokenType !== "refresh") {
      return res.status(401).json({ error: "Invalid token type" });
    }

    const existingToken = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: {
        user: {
          include: {
            role: true,
            organization: true,
          },
        },
      },
    });

    if (
      !existingToken ||
      existingToken.revokedAt ||
      existingToken.expiresAt.getTime() <= Date.now() ||
      existingToken.userId !== payload.userId
    ) {
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }

    const response = buildAuthResponse(existingToken.user);

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: existingToken.id },
        data: { revokedAt: new Date() },
      }),
      prisma.refreshToken.create({
        data: {
          userId: existingToken.user.id,
          organizationId: existingToken.user.organizationId,
          tokenHash: response.refreshTokenHash,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    return res.json({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      user: response.user,
    });
  } catch (err) {
    return next(err);
  }
});

authRouter.post("/logout", authRateLimiter, async (req, res, next) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);

    await prisma.refreshToken.updateMany({
      where: {
        tokenHash: hashToken(refreshToken),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        role: true,
        organization: true,
        memberships: {
          where: { isActive: true },
          include: {
            organization: true,
            role: true,
          },
        },
      },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
      organizationId: user.organizationId,
      organizationName: user.organization?.name ?? null,
      memberships: user.memberships.map((membership) => ({
        id: membership.id,
        role: membership.role.name,
        organization: {
          id: membership.organization.id,
          name: membership.organization.name,
          slug: membership.organization.slug,
        },
      })),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (err) {
    return next(err);
  }
});