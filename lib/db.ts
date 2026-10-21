import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/prisma/generated/client";

// Singleton PrismaClient pro bezpečnou správu připojení.
//
// Prisma ORM 7 vyžaduje u klienta driver adapter — pro PostgreSQL používáme
// `@prisma/adapter-pg` (PrismaPg). Klient je vygenerován příkazem
// `npm run db:generate` do `prisma/generated/` (viz `prisma/schema.prisma`).
//
// Tato vrstva je záměrně oddělena od doménové plánovací logiky (viz
// `lib/planning/`). Doménové modely zatím nejsou definovány; instance se tvoří
// bez aktivního připojení (ta vzniká až při prvním dotazu).

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? "",
});

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
