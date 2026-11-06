"use client";

import { useCallback, useState } from "react";

type Account = {
  id: string;
  email: string;
  displayName: string;
  role: "manager" | "viewer";
  active: boolean;
  mustChangePassword: boolean;
  createdAt: string;
};

type AccountDraft = Pick<Account, "displayName" | "role" | "active">;

function temporaryPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const values = crypto.getRandomValues(new Uint8Array(18));
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

async function responseError(response: Response): Promise<string> {
  const body = await response.json().catch(() => null) as { message?: string } | null;
  return body?.message ?? "Požadavek se nepodařilo dokončit.";
}

export function AccountManagement({ initialAccounts }: { initialAccounts: Account[] }) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [drafts, setDrafts] = useState<Record<string, AccountDraft>>(
    Object.fromEntries(initialAccounts.map((account) => [account.id, {
      displayName: account.displayName,
      role: account.role,
      active: account.active,
    }])),
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [oneTimePassword, setOneTimePassword] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Account["role"]>("viewer");

  const loadAccounts = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/accounts", { cache: "no-store" });
      if (!response.ok) throw new Error(await responseError(response));
      const body = await response.json() as { accounts: Account[] };
      setAccounts(body.accounts);
      setDrafts(Object.fromEntries(body.accounts.map((account) => [account.id, {
        displayName: account.displayName,
        role: account.role,
        active: account.active,
      }])));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Účty se nepodařilo načíst.");
    } finally {
      setLoading(false);
    }
  }, []);

  function updateDraft(id: string, patch: Partial<AccountDraft>) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  }

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const password = temporaryPassword();
    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, role, temporaryPassword: password }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      setOneTimePassword(password);
      setCopiedPassword(false);
      setEmail("");
      setName("");
      setRole("viewer");
      setNotice("Účet byl vytvořen. Předáte-li heslo uživateli, musí si ho při prvním přihlášení změnit.");
      await loadAccounts();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Účet se nepodařilo vytvořit.");
    } finally {
      setSaving(false);
    }
  }

  async function saveAccount(account: Account) {
    const draft = drafts[account.id];
    if (!draft) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/accounts/${encodeURIComponent(account.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.displayName,
          role: draft.role,
          active: draft.active,
        }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      setNotice(`Účet ${account.email} byl aktualizován.`);
      await loadAccounts();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Účet se nepodařilo uložit.");
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword(account: Account) {
    setSaving(true);
    setError("");
    setNotice("");
    const password = temporaryPassword();
    try {
      const response = await fetch(`/api/accounts/${encodeURIComponent(account.id)}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ temporaryPassword: password }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      setOneTimePassword(password);
      setCopiedPassword(false);
      setNotice(`Heslo pro ${account.email} bylo resetováno. Při příštím přihlášení bude vyžadována jeho změna.`);
      await loadAccounts();
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Heslo se nepodařilo resetovat.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="account-management">
      <section className="card" aria-labelledby="create-account-title">
        <div className="card__head">
          <div>
            <p className="eyebrow">Nový přístup</p>
            <h2 className="card__title" id="create-account-title">Vytvořit účet</h2>
          </div>
        </div>
        <form className="settings-form" onSubmit={(event) => void create(event)}>
          <div className="card__body account-form-grid">
            <label className="field__label">E-mail
              <input className="input" type="email" autoComplete="off" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="field__label">Jméno
              <input className="input" autoComplete="off" required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="field__label">Role
              <select className="input" value={role} onChange={(event) => setRole(event.target.value as Account["role"])}>
                <option value="viewer">Viewer</option>
                <option value="manager">Manager</option>
              </select>
            </label>
          </div>
          <div className="settings-form__actions">
            <button className="btn btn--primary" type="submit" disabled={saving || !email.trim() || !name.trim()}>
              Vytvořit účet a vygenerovat dočasné heslo
            </button>
            <span className="small muted">Heslo se zobrazí jednou po vytvoření.</span>
          </div>
        </form>
      </section>

      {oneTimePassword ? (
        <section className="settings-form__notice" aria-label="Jednorázové heslo">
          <div>
            <strong>Dočasné heslo — zobrazí se pouze nyní</strong>
            <p>Předejte ho uživateli bezpečným samostatným kanálem.</p>
            <code>{oneTimePassword}</code>
            <button
              className="btn btn--secondary"
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(oneTimePassword).then(() => setCopiedPassword(true));
              }}
            >
              {copiedPassword ? "Zkopírováno" : "Kopírovat"}
            </button>
          </div>
          <button className="btn btn--secondary" type="button" onClick={() => setOneTimePassword(null)}>
            Skrýt heslo
          </button>
        </section>
      ) : null}

      {notice ? <p className="settings-form__notice" role="status">{notice}</p> : null}
      {error ? <p className="form-notice form-notice--visible" role="alert">{error}</p> : null}

      <section className="card" aria-labelledby="accounts-title">
        <div className="card__head">
          <div>
            <p className="eyebrow">Přístupy</p>
            <h2 className="card__title" id="accounts-title">Uživatelské účty</h2>
          </div>
          <button className="btn btn--secondary" type="button" onClick={() => void loadAccounts()} disabled={loading || saving}>
            Obnovit seznam
          </button>
        </div>
        {loading ? <ul className="skeleton-list" aria-busy="true" aria-label="Načítám účty">{Array.from({ length: 3 }).map((_, i) => <li key={i} className="skeleton skeleton--account" />)}</ul> : null}
        {!loading && accounts.length === 0 ? <p>V databázi zatím nejsou žádné účty.</p> : null}
        {!loading && accounts.length > 0 ? (
          <div className="table-wrap account-table-wrap">
            <table className="staffing-settings-table">
              <thead>
                <tr><th scope="col">Uživatel</th><th scope="col">Role</th><th scope="col">Stav</th><th scope="col">Heslo</th><th scope="col">Akce</th></tr>
              </thead>
              <tbody>
                {accounts.map((account) => {
                  const draft = drafts[account.id];
                  if (!draft) return null;
                  return (
                    <tr key={account.id}>
                      <th scope="row">
                        <label className="sr-only" htmlFor={`name-${account.id}`}>Jméno {account.email}</label>
                        <input id={`name-${account.id}`} className="input" value={draft.displayName} maxLength={120} onChange={(event) => updateDraft(account.id, { displayName: event.target.value })} />
                        <span className="small muted">{account.email}</span>
                      </th>
                      <td data-label="Role">
                        <label className="sr-only" htmlFor={`role-${account.id}`}>Role {account.email}</label>
                        <select id={`role-${account.id}`} className="input" value={draft.role} onChange={(event) => updateDraft(account.id, { role: event.target.value as Account["role"] })}>
                          <option value="manager">Manager</option><option value="viewer">Viewer</option>
                        </select>
                      </td>
                      <td data-label="Stav">
                        <label className="sr-only" htmlFor={`active-${account.id}`}>Stav {account.email}</label>
                        <select id={`active-${account.id}`} className="input" value={String(draft.active)} onChange={(event) => updateDraft(account.id, { active: event.target.value === "true" })}>
                          <option value="true">Aktivní</option><option value="false">Deaktivovaný</option>
                        </select>
                      </td>
                      <td data-label="Heslo">{account.mustChangePassword ? "Vyžaduje změnu" : "Bez vynucené změny"}</td>
                      <td data-label="Akce">
                        <div className="settings-form__actions">
                          <button className="btn btn--secondary" type="button" disabled={saving} onClick={() => void saveAccount(account)}>Uložit</button>
                          <button className="btn btn--secondary" type="button" disabled={saving || !account.active} onClick={() => void resetPassword(account)}>Resetovat heslo</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
