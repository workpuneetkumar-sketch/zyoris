import { Router } from "express";
import { Prisma, LeadStatus, LeadActivityType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import {
  leadAccessWhere,
  resolveAssignedToId,
  canChangeLeadPrivilegedFields,
  canFilterByAssignee,
} from "../services/permissionService";
import { Action } from "../types/permissions";
import { canPerform } from "../services/permissionService";

export const leadsRouter = Router();

const createLeadSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  company: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  status: z.nativeEnum(LeadStatus).optional(),
  assignedToId: z.string().optional().nullable(),
  tags: z.array(z.string().min(1)).optional().default([]),
  note: z.string().optional().nullable(),
});

const listSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.nativeEnum(LeadStatus).optional(),
  city: z.string().optional(),
  source: z.string().optional(),
  assignedToId: z.string().optional(),
  q: z.string().optional(),
  tags: z.string().optional(),
  createdFrom: z.string().optional(),
  createdTo: z.string().optional(),
});

const updateLeadSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  company: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  status: z.nativeEnum(LeadStatus).optional(),
  assignedToId: z.string().optional().nullable(),
  tags: z.array(z.string().min(1)).optional(),
});

const assignSchema = z.object({
  assignedToId: z.string().min(1),
});

const noteSchema = z.object({
  note: z.string().min(1),
});

function buildListWhere(
  user: { userId: string; role: string; organizationId: string },
  input: z.infer<typeof listSchema>
): Prisma.LeadWhereInput {
  const base = leadAccessWhere(user);
  const where: Prisma.LeadWhereInput = { ...base };

  if (input.status) where.status = input.status;
  if (input.city) where.city = input.city;
  if (input.source) where.source = input.source;

  // Only privileged roles may filter by a specific assignee
  if (input.assignedToId && canFilterByAssignee(user)) {
    where.assignedToId = input.assignedToId;
  }

  if (input.q) {
    where.OR = [
      { name: { contains: input.q, mode: "insensitive" } },
      { email: { contains: input.q, mode: "insensitive" } },
      { phone: { contains: input.q, mode: "insensitive" } },
      { company: { contains: input.q, mode: "insensitive" } },
    ];
  }

  if (input.tags) {
    const labels = input.tags
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    if (labels.length > 0) {
      where.tags = { some: { label: { in: labels } } };
    }
  }

  if (input.createdFrom || input.createdTo) {
    where.createdAt = {};
    if (input.createdFrom) where.createdAt.gte = new Date(input.createdFrom);
    if (input.createdTo) where.createdAt.lte = new Date(input.createdTo);
  }

  return where;
}

async function ensureAssigneeInOrg(organizationId: string, assigneeId: string) {
  const assignee = await prisma.user.findFirst({
    where: { id: assigneeId, organizationId },
    select: { id: true },
  });
  return !!assignee;
}

// POST /leads/create-leads
leadsRouter.post("/create-leads", async (req, res, next) => {
  try {
    const user = req.user!;
    const organizationId = user.organizationId!;
    const input = createLeadSchema.parse(req.body);
    const finalAssignedToId = resolveAssignedToId(user, input.assignedToId);

    if (finalAssignedToId) {
      const exists = await ensureAssigneeInOrg(organizationId, finalAssignedToId);
      if (!exists) return res.status(400).json({ error: "Assignee not in organization" });
    }

    const created = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.create({
        data: {
          organizationId,
          name: input.name,
          phone: input.phone ?? null,
          email: input.email ?? null,
          company: input.company ?? null,
          city: input.city ?? null,
          source: input.source ?? null,
          status: input.status ?? LeadStatus.NEW,
          assignedToId: finalAssignedToId,
        },
      });

      if (input.tags.length > 0) {
        await tx.leadTag.createMany({
          data: input.tags.map((label) => ({ leadId: lead.id, label })),
          skipDuplicates: true,
        });
      }

      await tx.leadStatusHistory.create({
        data: {
          leadId: lead.id,
          fromStatus: null,
          toStatus: lead.status,
        },
      });

      await tx.leadActivity.create({
        data: {
          leadId: lead.id,
          type: LeadActivityType.CREATED,
          message: "Lead created",
          createdById: user.userId,
        },
      });

      if (finalAssignedToId) {
        await tx.leadAssignment.create({
          data: {
            leadId: lead.id,
            assignedToId: finalAssignedToId,
            assignedById: user.userId,
          },
        });

        await tx.leadActivity.create({
          data: {
            leadId: lead.id,
            type: LeadActivityType.ASSIGNED,
            message: "Lead assigned",
            createdById: user.userId,
            metadata: { assignedToId: finalAssignedToId },
          },
        });
      }

      if (input.note) {
        await tx.leadNote.create({
          data: {
            leadId: lead.id,
            createdById: user.userId,
            note: input.note,
          },
        });

        await tx.leadActivity.create({
          data: {
            leadId: lead.id,
            type: LeadActivityType.NOTE_ADDED,
            message: "Initial note added",
            createdById: user.userId,
          },
        });
      }

      return tx.lead.findUnique({
        where: { id: lead.id },
        include: {
          tags: true,
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      });
    });

    return res.status(201).json(created);
  } catch (err) {
    return next(err);
  }
});

// GET /leads/get-leads
leadsRouter.get("/get-leads", async (req, res, next) => {
  try {
    const user = req.user!;
    const organizationId = user.organizationId!;
    const input = listSchema.parse(req.query);

    const page = input.page;
    const limit = input.limit;
    const skip = (page - 1) * limit;

    const where = buildListWhere(
      { userId: user.userId, role: user.role, organizationId },
      input
    );

    const [data, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          tags: true,
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return res.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    return next(err);
  }
});

// GET /leads/get-lead/:leadId
leadsRouter.get("/get-lead/:leadId", async (req, res, next) => {
  try {
    const user = req.user!;
    const organizationId = user.organizationId!;
    const { leadId } = req.params;

    const where: Prisma.LeadWhereInput = {
      ...leadAccessWhere({ userId: user.userId, role: user.role, organizationId }),
      id: leadId,
    };

    const lead = await prisma.lead.findFirst({
      where,
      include: {
        tags: true,
        notes: { orderBy: { createdAt: "desc" } },
        activities: { orderBy: { createdAt: "desc" } },
        statusHistory: { orderBy: { changedAt: "desc" } },
        assignments: { orderBy: { assignedAt: "desc" } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    if (!lead) return res.status(404).json({ error: "Lead not found" });
    return res.json(lead);
  } catch (err) {
    return next(err);
  }
});

// PATCH /leads/update-lead/:leadId
leadsRouter.patch("/update-lead/:leadId", async (req, res, next) => {
  try {
    const user = req.user!;
    const organizationId = user.organizationId!;
    const { leadId } = req.params;
    const input = updateLeadSchema.parse(req.body);

    const where: Prisma.LeadWhereInput = {
      ...leadAccessWhere({ userId: user.userId, role: user.role, organizationId }),
      id: leadId,
    };

    const current = await prisma.lead.findFirst({ where });
    if (!current) return res.status(404).json({ error: "Lead not found" });
    if (!canChangeLeadPrivilegedFields(user)) {
      if (input.assignedToId !== undefined || input.status !== undefined) {
        return res.status(403).json({ error: "Insufficient role to reassign or change status" });
      }
    }

    if (input.assignedToId) {
      const exists = await ensureAssigneeInOrg(organizationId, input.assignedToId);
      if (!exists) return res.status(400).json({ error: "Assignee not in organization" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.update({
        where: { id: current.id },
        data: {
          name: input.name ?? current.name,
          phone: input.phone === undefined ? current.phone : input.phone,
          email: input.email === undefined ? current.email : input.email,
          company: input.company === undefined ? current.company : input.company,
          city: input.city === undefined ? current.city : input.city,
          source: input.source === undefined ? current.source : input.source,
          status: input.status ?? current.status,
          assignedToId:
            input.assignedToId === undefined ? current.assignedToId : input.assignedToId,
        },
      });

      await tx.leadActivity.create({
        data: {
          leadId: lead.id,
          type: LeadActivityType.UPDATED,
          message: "Lead updated",
          createdById: user.userId,
        },
      });

      if (input.status && input.status !== current.status) {
        await tx.leadStatusHistory.create({
          data: {
            leadId: lead.id,
            fromStatus: current.status,
            toStatus: input.status,
          },
        });

        await tx.leadActivity.create({
          data: {
            leadId: lead.id,
            type: LeadActivityType.STATUS_CHANGED,
            message: "Lead status changed",
            createdById: user.userId,
            metadata: { from: current.status, to: input.status },
          },
        });
      }

      if (input.assignedToId !== undefined && input.assignedToId !== current.assignedToId) {
        if (input.assignedToId) {
          await tx.leadAssignment.create({
            data: {
              leadId: lead.id,
              assignedToId: input.assignedToId,
              assignedById: user.userId,
            },
          });
        }

        await tx.leadActivity.create({
          data: {
            leadId: lead.id,
            type: LeadActivityType.ASSIGNED,
            message: "Lead reassigned",
            createdById: user.userId,
            metadata: { assignedToId: input.assignedToId ?? null },
          },
        });
      }

      if (input.tags) {
        await tx.leadTag.deleteMany({ where: { leadId: lead.id } });
        if (input.tags.length > 0) {
          await tx.leadTag.createMany({
            data: input.tags.map((label) => ({ leadId: lead.id, label })),
            skipDuplicates: true,
          });
        }
      }

      return tx.lead.findUnique({
        where: { id: lead.id },
        include: {
          tags: true,
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      });
    });

    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});

// POST /leads/assign-lead/:leadId
leadsRouter.post("/assign-lead/:leadId", async (req, res, next) => {
  try {
    const user = req.user!;
    const organizationId = user.organizationId!;
    if (!canPerform(user, Action.LEAD_ASSIGN)) {
      return res.status(403).json({ error: "Only manager roles can assign leads" });
    }

    const { leadId } = req.params;
    const { assignedToId } = assignSchema.parse(req.body);

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId },
      select: { id: true },
    });
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const exists = await ensureAssigneeInOrg(organizationId, assignedToId);
    if (!exists) return res.status(400).json({ error: "Assignee not in organization" });

    await prisma.$transaction([
      prisma.lead.update({
        where: { id: lead.id },
        data: { assignedToId },
      }),
      prisma.leadAssignment.create({
        data: {
          leadId: lead.id,
          assignedToId,
          assignedById: user.userId,
        },
      }),
      prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          type: LeadActivityType.ASSIGNED,
          message: "Lead assigned",
          createdById: user.userId,
          metadata: { assignedToId },
        },
      }),
    ]);

    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
});

// POST /leads/add-note/:leadId
leadsRouter.post("/add-note/:leadId", async (req, res, next) => {
  try {
    const user = req.user!;
    const organizationId = user.organizationId!;
    const { leadId } = req.params;
    const { note } = noteSchema.parse(req.body);

    const where: Prisma.LeadWhereInput = {
      ...leadAccessWhere({ userId: user.userId, role: user.role, organizationId }),
      id: leadId,
    };

    const lead = await prisma.lead.findFirst({
      where,
      select: { id: true },
    });
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const created = await prisma.$transaction(async (tx) => {
      const noteRow = await tx.leadNote.create({
        data: {
          leadId: lead.id,
          createdById: user.userId,
          note,
        },
      });

      await tx.leadActivity.create({
        data: {
          leadId: lead.id,
          type: LeadActivityType.NOTE_ADDED,
          message: "Note added",
          createdById: user.userId,
        },
      });

      return noteRow;
    });

    return res.status(201).json(created);
  } catch (err) {
    return next(err);
  }
});
