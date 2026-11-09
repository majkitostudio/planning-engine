"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import type { AuthMode } from "@/lib/auth/local";
import { DATABASE_LOGIN_LOCK_MINUTES, DATABASE_LOGIN_MAX_FAILURES } from "@/lib/auth/login-policy";

export function LoginForm({
  authConfigured,
  authMode,
  passwordChanged = false,
}: {
  authConfigured: boolean;
  authMode: AuthMode;
  passwordChanged?: boolean;
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
          callbackUrl: "/planovani",
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
      {passwordChanged ? (
        <p className="form-notice form-notice--visible" role="status">
          Heslo bylo změněno. Přihlaste se znovu novým heslem.
        </p>
      ) : null}
      <form className="login__form" method="post" action="/prihlaseni" onSubmit={(event) => void handleSignIn(event)}>
        {authMode === "local" || authMode === "database" ? (
          <>
            <div className="field">
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
            </div>
            <div className="field">
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
            </div>
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

      {error ? (
        <p className="form-notice form-notice--visible" role="alert">
          <strong>Přihlášení se nepodařilo.</strong> Zkontrolujte údaje a
          zkuste to znovu.
          {authMode === "database" ? ` Po ${DATABASE_LOGIN_MAX_FAILURES} chybných pokusech za sebou se přihlášení k účtu na ${DATABASE_LOGIN_LOCK_MINUTES} minut pozastaví.` : null}
        </p>
      ) : null}
    </div>
  );
}
