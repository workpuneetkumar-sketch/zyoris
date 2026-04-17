import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

export async function seedRoles() {
  const passwordHash = await bcrypt.hash("ChangeMe123!", 10);
  const demoPasswordHash = await bcrypt.hash("Zyoris!", 10);

  // Create roles
  const roles = [
    { id: "role_admin", name: "ADMIN", description: "Administrator role" },
    { id: "role_ceo", name: "CEO", description: "Chief Executive Officer" },
    { id: "role_cfo", name: "CFO", description: "Chief Financial Officer" },
    { id: "role_sales_head", name: "SALES_HEAD", description: "Sales Head" },
    { id: "role_operations_head", name: "OPERATIONS_HEAD", description: "Operations Head" },
    { id: "role_user", name: "USER", description: "Regular user role" },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { id: role.id },
      create: { id: role.id, name: role.name, description: role.description },
      update: {},
    });
  }

  // Create users
  const users = [
    { email: "admin@zyoris.local", name: "ADMIN", roleId: "role_admin" },
    { email: "ceo@zyoris.local", name: "CEO", roleId: "role_ceo" },
    { email: "cfo@zyoris.local", name: "CFO", roleId: "role_cfo" },
    { email: "sales@zyoris.local", name: "SALES_HEAD", roleId: "role_sales_head" },
    { email: "ops@zyoris.local", name: "OPERATIONS_HEAD", roleId: "role_operations_head" },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      create: { email: u.email, name: u.name, password: passwordHash, roleId: u.roleId },
      update: { roleId: u.roleId },
    });
  }

  // Demo user
  await prisma.user.upsert({
    where: { email: "Demo@zyoris.local" },
    create: {
      email: "Demo@zyoris.local",
      name: "Demo User",
      password: demoPasswordHash,
      roleId: "role_admin",
      designation: "Demo Operator",
      companyName: "Zyoris Demo Corp",
      companyAbout: "Simulated enterprise dataset for investor previews",
      businessType: "SaaS",
    },
    update: { roleId: "role_admin" },
  });
}