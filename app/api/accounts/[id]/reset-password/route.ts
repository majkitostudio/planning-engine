import { NextResponse } from "next/server";

import { resetAccountPassword } from "@/lib/auth/account-service";
import {
  accountServiceErrorResponse,
  asRecord,
  readJsonBody,
  requireDatabaseManager,
} from "@/lib/auth/account-api";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { readonly params: Promise<{ readonly id: string }> },
) {
  const access = await requireDatabaseManager();
  if (!access.ok) return access.response;

  const record = asRecord(await readJsonBody(request));
  if (!record || typeof record.temporaryPassword !== "string") {
    return NextResponse.json(
      { ok: false, error: "invalid_request", message: "Zadejte dočasné heslo." },
      { status: 400 },
    );
  }

  try {
    const { id } = await context.params;
    const account = await resetAccountPassword(
      id,
      record.temporaryPassword,
      access.actor,
      prisma,
    );
    return NextResponse.json({ ok: true, account });
  } catch (error) {
    return accountServiceErrorResponse(error);
  }
}
