import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signAccessToken, signRefreshToken } from "../middleware/auth";

export const organizationsRouter = Router();

const createOrganizationSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
});

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

organizationsRouter.post("/create-org", async (req, res, next) => {
  try {
    const { name, slug } = createOrganizationSchema.parse(req.body);
    const userId = req.user!.userId;

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (currentUser.organizationId && currentUser.role.name !== "ADMIN") {
      return res.status(403).json({ error: "Only admins can create additional organizations" });
    }

    const adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" } });
    if (!adminRole) {
      return res.status(500).json({ error: "Admin role not found" });
    }

    const normalizedSlug = slug ?? slugify(name);

    const result = await prisma.$transaction(async (transaction) => {
      const organization = await transaction.organization.create({
        data: {
          name,
          slug: normalizedSlug,
        },
      });

      const user = await transaction.user.update({
        where: { id: userId },
        data: {
          organizationId: organization.id,
          roleId: adminRole.id,
        },
        include: {
          role: true,
          organization: true,
        },
      });

      await transaction.organizationMembership.upsert({
        where: {
          organizationId_userId: {
            organizationId: organization.id,
            userId,
          },
        },
        update: {
          roleId: adminRole.id,
          isActive: true,
        },
        create: {
          organizationId: organization.id,
          userId,
          roleId: adminRole.id,
          isActive: true,
        },
      });

      return { organization, user };
    });

    const accessToken = signAccessToken({
      userId: result.user.id,
      role: result.user.role.name,
      organizationId: result.user.organizationId,
    });
    const { token: refreshToken, hash } = signRefreshToken({
      userId: result.user.id,
      role: result.user.role.name,
      organizationId: result.user.organizationId,
    });

    await prisma.refreshToken.create({
      data: {
        userId: result.user.id,
        organizationId: result.user.organizationId,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return res.status(201).json({
      organization: result.organization,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    return next(err);
  }
});

organizationsRouter.get("/get-orgs", async (req, res, next) => {
  try {
    const memberships = await prisma.organizationMembership.findMany({
      where: {
        userId: req.user!.userId,
        isActive: true,
      },
      include: {
        organization: true,
        role: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return res.json({
      organizations: memberships.map((membership) => ({
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        isActive: membership.organization.isActive,
        role: membership.role.name,
      })),
    });
  } catch (err) {
    return next(err);
  }
});