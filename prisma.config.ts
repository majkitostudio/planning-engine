import "dotenv/config";
import { defineConfig } from "prisma/config";

// Konfigurace Prisma CLI pro Prisma ORM 7.
//
// Prisma schema obsahuje perzistenci plánovacích snapshotů a syntetického
// pilotu. `prisma generate` nevyžaduje běžící databázový server.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Pro Neon použij přímé připojení; pooler není vhodný pro migrace.
    // `prisma generate` funguje i bez nastavené proměnné prostředí.
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
});
