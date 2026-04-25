import type { Prisma } from "@prisma/client";

declare module "@prisma/client" {
  interface PrismaClient {
    chatSession: Prisma.ChatSessionDelegate<Prisma.$Extensions.DefaultArgs>;
    chatMessage: Prisma.ChatMessageDelegate<Prisma.$Extensions.DefaultArgs>;
  }
}
