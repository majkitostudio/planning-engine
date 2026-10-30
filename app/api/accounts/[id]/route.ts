import { NextResponse } from "next/server";

import { updateAccount } from "@/lib/auth/account-service";
import {
  accountServiceErrorResponse,
  asRecord,
  readJsonBody,
  requireDatabaseManager,
} from "@/lib/auth/account-api";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { readonly params: Promise<{ readonly id: string }> },
) {
  const access = await requireDatabaseManager();
  if (!access.ok) return access.response;

  const record = asRecord(await readJsonBody(request));
  if (
    !record ||
    (record.name !== undefined && typeof record.name !== "string") ||
    (record.role !== undefined && record.role !== "manager" && record.role !== "viewer") ||
    (record.active !== undefined && typeof record.active !== "boolean")
  ) {
    return NextResponse.json(
      { ok: false, error: "invalid_request", message: "Změna účtu nemá platný formát." },
      { status: 400 },
    );
  }

  try {
    const { id } = await context.params;
    const account = await updateAccount(
      id,
      {
        ...(record.name === undefined ? {} : { displayName: record.name }),
        ...(record.role === undefined ? {} : { role: record.role }),
        ...(record.active === undefined ? {} : { active: record.active }),
      },
      access.actor,
      prisma,
    );
    return NextResponse.json({ ok: true, account });
  } catch (error) {
    return accountServiceErrorResponse(error);
  }
}
