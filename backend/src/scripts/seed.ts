import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

async function main() {
  const passwordHash = await bcrypt.hash("ChangeMe123!", 10);
  const demoPasswordHash = await bcrypt.hash("Zyoris!", 10);

  const roles = [
    { email: "admin@zyoris.local", role: "ADMIN" },
    { email: "ceo@zyoris.local", role: "CEO" },
    { email: "cfo@zyoris.local", role: "CFO" },
    { email: "sales@zyoris.local", role: "SALES_HEAD" },
    { email: "ops@zyoris.local", role: "OPERATIONS_HEAD" },
  ] as const;

  for (const r of roles) {
    await prisma.user.upsert({
      where: { email: r.email },
      create: {
        email: r.email,
        name: r.role,
        password: passwordHash,
        role: r.role as any,
      },
      update: {},
    });
  }

  // Dedicated demo user with its own credentials
  await prisma.user.upsert({
    where: { email: "Demo@zyoris.local" },
    create: {
      email: "Demo@zyoris.local",
      name: "Demo User",
      password: demoPasswordHash,
      role: "ADMIN" as any,
      designation: "Demo Operator",
      companyName: "Zyoris Demo Corp",
      companyAbout: "Simulated enterprise dataset for investor previews",
      businessType: "SaaS",
    },
    update: {},
  });

  // eslint-disable-next-line no-console
  console.log("Seeded default users (ChangeMe123!) and demo user Demo@zyoris.local (Zyoris!).");
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

