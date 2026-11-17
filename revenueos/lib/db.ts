import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { revenueOsPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.revenueOsPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.revenueOsPrisma = prisma;
}
