import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { changeAccountPassword, AccountServiceError } from "@/lib/auth/account-service";
import { getActiveAuthRuntimeConfig } from "@/lib/auth/local";
import { validatePasswordLength } from "@/lib/auth/password";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const runtimeConfig = getActiveAuthRuntimeConfig();
  if (!runtimeConfig.ok || runtimeConfig.mode !== "database") {
    return NextResponse.json(
      { ok: false, error: "auth_not_configured", message: "Databázové účty nejsou nakonfigurované." },
      { status: 503 },
    );
  }

  const session = await auth();
  const accountId = session?.user?.id;
  if (!accountId || !session.user.email || !session.user.role) {
    return NextResponse.json(
      { ok: false, error: "unauthorized", message: "Přihlaste se znovu." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_request", message: "Tělo požadavku není platný JSON." },
      { status: 400 },
    );
  }

  const record = typeof body === "object" && body !== null
    ? body as Record<string, unknown>
    : null;
  const currentPassword = record?.currentPassword;
  const newPassword = record?.newPassword;
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return NextResponse.json(
      { ok: false, error: "invalid_request", message: "Vyplňte současné i nové heslo." },
      { status: 400 },
    );
  }
  try {
    validatePasswordLength(newPassword);
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_password", message: "Nové heslo musí mít 12 až 128 znaků." },
      { status: 400 },
    );
  }

  try {
    await changeAccountPassword(accountId, currentPassword, newPassword, prisma);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error instanceof AccountServiceError &&
      (error.code === "invalid_credentials" || error.code === "password_unchanged")
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: error.code,
          message: error.code === "invalid_credentials"
            ? "Současné heslo není správné."
            : error.message,
        },
        { status: 400 },
      );
    }
    if (error instanceof AccountServiceError && error.code === "account_changed") {
      return NextResponse.json(
        { ok: false, error: error.code, message: error.message },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "password_change_failed", message: "Heslo se nepodařilo změnit." },
      { status: 500 },
    );
  }
}
