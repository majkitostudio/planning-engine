import { NextResponse } from "next/server";

import { createAccount, listAccounts } from "@/lib/auth/account-service";
import {
  accountServiceErrorResponse,
  asRecord,
  readJsonBody,
  requireDatabaseManager,
} from "@/lib/auth/account-api";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const access = await requireDatabaseManager();
  if (!access.ok) return access.response;

  try {
    const accounts = await listAccounts(prisma);
    return NextResponse.json({ ok: true, accounts });
  } catch {
    return NextResponse.json(
      { ok: false, error: "account_list_failed", message: "Seznam účtů se nepodařilo načíst." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const access = await requireDatabaseManager();
  if (!access.ok) return access.response;

  const record = asRecord(await readJsonBody(request));
  if (
    !record ||
    typeof record.email !== "string" ||
    typeof record.name !== "string" ||
    (record.role !== "manager" && record.role !== "viewer") ||
    typeof record.temporaryPassword !== "string"
  ) {
    return NextResponse.json(
      { ok: false, error: "invalid_request", message: "Vyplňte e-mail, jméno, roli a dočasné heslo." },
      { status: 400 },
    );
  }

  try {
    const account = await createAccount(
      {
        email: record.email,
        displayName: record.name,
        role: record.role,
        temporaryPassword: record.temporaryPassword,
      },
      access.actor,
      prisma,
    );
    return NextResponse.json({ ok: true, account }, { status: 201 });
  } catch (error) {
    return accountServiceErrorResponse(error);
  }
}
