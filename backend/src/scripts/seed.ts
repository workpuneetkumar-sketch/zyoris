import { seedRoles } from "./seedRoles";

type SeedFunction = () => Promise<void>;

const seeds: Record<string, SeedFunction> = {
  roles: seedRoles
};

async function main() {
  const seedName = process.argv[2];

  if (!seedName) {
    // Run all seeds
    for (const [name, fn] of Object.entries(seeds)) {
      await fn();
    }
    return;
  }

  if (seeds[seedName]) {
    await seeds[seedName]();
  } else {
    console.error(`❌ Seed "${seedName}" not found. Available seeds: ${Object.keys(seeds).join(", ")}`);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("../lib/prisma");
    await prisma.$disconnect();
  });