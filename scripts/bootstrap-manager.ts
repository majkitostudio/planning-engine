import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/prisma/generated/client";
import {
  AccountServiceError,
  bootstrapFirstManager,
} from "@/lib/auth/account-service";
import { getBootstrapManagerConfig } from "@/lib/auth/bootstrap-config";

async function main(): Promise<void> {
  const result = getBootstrapManagerConfig();
  if (!result.ok) {
    console.error(result.message);
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: result.config.connectionString }),
  });

  try {
    const account = await bootstrapFirstManager(
      {
        email: result.config.email,
        displayName: result.config.displayName,
        temporaryPassword: result.config.temporaryPassword,
      },
      prisma,
    );
    console.log(`Bootstrap managera dokončen pro ${account.email}.`);
  } catch (error) {
    if (error instanceof AccountServiceError) {
      console.error(error.message);
    } else {
      console.error(
        "Bootstrap managera selhal. Ověřte konfiguraci, migraci databáze a zda bootstrap už neproběhl.",
      );
    }
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
