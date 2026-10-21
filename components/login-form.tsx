"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export function LoginForm() {
  const [notice, setNotice] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(true);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label className="field__label" htmlFor="email">
          E-mail
        </label>
        <input
          className="input"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="jmeno.prijmeni@aaauto.cz"
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="password">
          Heslo
        </label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
        />
      </div>

      <button className="btn btn--primary btn--block" type="submit">
        Přihlásit se
      </button>

      <p
        className={`form-notice${notice ? " form-notice--visible" : ""}`}
        role="alert"
      >
        <strong>Autentizace není implementována.</strong> Jedná se o vizuální
        náhled přihlašovací obrazovky — formulář nic neodesílá a nezabezpečuje
        aplikaci.
      </p>

      <p className="login__foot">
        <Link href="/">Zobrazit ukázkový přehled</Link>
      </p>
    </form>
  );
}
