import { defineConfig } from "prisma/config";

try {
  process.loadEnvFile(".env");
} catch {
  void 0;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
