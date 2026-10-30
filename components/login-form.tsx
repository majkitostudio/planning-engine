"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import type { AuthMode } from "@/lib/auth/local";

export function LoginForm({
  authConfigured,
  authMode,
}: {
  authConfigured: boolean;
  authMode: AuthMode;
}) {
  const [error, setError] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(false);
    try {
      const result = await signIn(
        authMode === "local" || authMode === "database"
          ? "credentials"
          : "microsoft-entra-id",
        {
          ...(authMode === "local" || authMode === "database" ? { email, password } : {}),
          callbackUrl: "/",
          redirect: false,
        },
      );
      if (result?.error) setError(true);
      if (result?.url) window.location.assign(result.url);
    } catch {
      setError(true);
    }
  }

  return (
    <div>
      <form onSubmit={(event) => void handleSignIn(event)}>
        {authMode === "local" || authMode === "database" ? (
          <>
            <label className="field__label" htmlFor="login-email">
              E-mail
            </label>
            <input
              className="input"
              id="login-email"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={!authConfigured}
            />
            <label className="field__label" htmlFor="login-password">
              Heslo
            </label>
            <input
              className="input"
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={!authConfigured}
            />
          </>
        ) : null}

        <button
          className="btn btn--primary btn--block"
          type="submit"
          disabled={!authConfigured}
        >
          {authMode === "local" || authMode === "database"
            ? "Přihlásit se"
            : "Přihlásit přes Microsoft 365"}
        </button>
      </form>

      {!authConfigured ? (
        <p className="form-notice form-notice--visible" role="alert">
          <strong>Přihlášení není nakonfigurované.</strong> Zkontrolujte
          nastavení přihlašovacího režimu.
        </p>
      ) : null}

      {error ? (
        <p className="form-notice form-notice--visible" role="alert">
          <strong>Přihlášení se nepodařilo.</strong> Zkontrolujte údaje a
          zkuste to znovu.
        </p>
      ) : null}

      <p className="login__foot">
        <Link href="/">Zpět</Link>
      </p>
    </div>
  );
}
