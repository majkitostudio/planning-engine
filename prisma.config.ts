import "dotenv/config";
import { defineConfig } from "prisma/config";

// Konfigurace Prisma CLI pro Prisma ORM 7.
//
// Databázové modely zatím nejsou definovány (čeká na schválení domény), proto
// obsahuje konfigurace pouze technický základ. `prisma generate` nevyžaduje
// běžící databázový server.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Používáme `process.env.DATABASE_URL ?? ""` místo pomocníka `env()`,
    // aby `prisma generate` fungoval i bez nastavené proměnné prostředí
    // (podle dokumentace Prisma ORM v7).
    url: process.env.DATABASE_URL ?? "",
  },
});
