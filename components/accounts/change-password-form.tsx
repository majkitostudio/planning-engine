"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ChangePasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmation) {
      setError("Nová hesla se neshodují.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) {
        setError(result.message ?? "Heslo se nepodařilo změnit.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      router.replace("/");
      router.refresh();
    } catch {
      setError("Heslo se nepodařilo změnit. Zkuste to znovu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={(event) => void submit(event)}>
      <label className="field__label" htmlFor="current-password">Současné heslo</label>
      <input
        className="input"
        id="current-password"
        type="password"
        autoComplete="current-password"
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
        required
      />
      <label className="field__label" htmlFor="new-password">Nové heslo</label>
      <input
        className="input"
        id="new-password"
        type="password"
        autoComplete="new-password"
        minLength={12}
        maxLength={128}
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
        required
      />
      <label className="field__label" htmlFor="confirm-password">Potvrdit nové heslo</label>
      <input
        className="input"
        id="confirm-password"
        type="password"
        autoComplete="new-password"
        minLength={12}
        maxLength={128}
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
        required
      />
      {error ? <p className="form-notice form-notice--visible" role="alert">{error}</p> : null}
      <button className="btn btn--primary" type="submit" disabled={saving}>
        {saving ? "Ukládám…" : "Změnit heslo"}
      </button>
    </form>
  );
}
