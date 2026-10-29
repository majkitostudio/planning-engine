"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import {
  DEFAULT_STAFFING_MINIMUMS,
  STAFFING_SHIFT_KINDS,
  type StaffingSetting,
} from "@/lib/planning/staffing-settings";

const DAY_LABELS = [
  "Pondělí",
  "Úterý",
  "Středa",
  "Čtvrtek",
  "Pátek",
  "Sobota",
  "Neděle",
] as const;

type SettingsResponse =
  | { readonly ok: true; readonly settings: readonly StaffingSetting[] }
  | { readonly ok: false; readonly rejected?: { readonly message?: string } };

export function StaffingSettingsForm({
  initialSettings,
  canEdit,
  persistenceConfigured,
  notice: initialNotice,
}: {
  readonly initialSettings: readonly StaffingSetting[];
  readonly canEdit: boolean;
  readonly persistenceConfigured: boolean;
  readonly notice: string | null;
}) {
  const [settings, setSettings] = useState(() => newSettingsMap(initialSettings));
  const [notice, setNotice] = useState<string | null>(initialNotice);
  const [isSaving, setIsSaving] = useState(false);

  function updateSetting(dayOfWeek: number, shiftKind: StaffingSetting["shiftKind"], value: string) {
    setSettings((current) => ({
      ...current,
      [settingKey(dayOfWeek, shiftKind)]: value,
    }));
  }

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setNotice(null);

    try {
      const response = await fetch("/api/settings/staffing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: toPayload(settings) }),
      });
      const data = (await response.json()) as SettingsResponse;
      if (!response.ok || !data.ok) {
        setNotice(data.ok ? "Nastavení se nepodařilo uložit." : data.rejected?.message ?? "Nastavení se nepodařilo uložit.");
        return;
      }

      setSettings(newSettingsMap(data.settings));
      setNotice("Nastavení bylo uloženo.");
    } catch {
      setNotice("Nastavení se nepodařilo uložit kvůli chybě spojení.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div className="page-head__lead">
          <span className="page-head__icon" aria-hidden="true">
            <Icon name="settings" width={22} height={22} />
          </span>
          <div>
            <h1 className="page-head__title">Nastavení obsazení</h1>
            <p className="page-head__sub">
              Minimální počet lidí pro ranní a odpolední směnu v jednom týdnu.
            </p>
          </div>
        </div>
      </div>

      <div className="demo-notice" role="note">
        <span className="demo-notice__icon" aria-hidden="true">
          <Icon name="info" width={17} height={17} />
        </span>
        <p>
          <strong>Pilotní konfigurovatelná data.</strong> Hodnoty nejsou pracovněprávním pravidlem ani produkčním nastavením. Návrh směn ani náhrady se tímto formulářem automaticky nepotvrzují.
        </p>
      </div>

      {notice ? <p className="settings-form__notice" role="status">{notice}</p> : null}

      <form className="card settings-form" onSubmit={saveSettings}>
        <div className="card__head">
          <div>
            <h2 className="card__title">Potřebné obsazení směn</h2>
            <p className="card__sub">
              {canEdit ? "Upravte hodnoty a uložte je pro další lokální výpočty." : "Viewer může hodnoty pouze zobrazit."}
            </p>
          </div>
          {canEdit ? <span className="settings-form__role">MANAGER</span> : <span className="settings-form__role">VIEWER</span>}
        </div>

        <div className="table-wrap">
          <table className="staffing-settings-table">
            <thead>
              <tr>
                <th scope="col">Den</th>
                <th scope="col">Ranní směna</th>
                <th scope="col">Odpolední směna</th>
              </tr>
            </thead>
            <tbody>
              {DAY_LABELS.map((label, dayOfWeek) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {STAFFING_SHIFT_KINDS.map((shiftKind) => (
                    <td key={shiftKind}>
                      <label className="settings-form__field">
                        <span className="sr-only">{label}, {shiftKind === "morning" ? "ranní" : "odpolední"} směna</span>
                        <input
                          className="input settings-form__input"
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          value={settings[settingKey(dayOfWeek, shiftKind)] ?? DEFAULT_STAFFING_MINIMUMS[shiftKind]}
                          onChange={(event) => updateSetting(dayOfWeek, shiftKind, event.target.value)}
                          disabled={!canEdit || isSaving}
                          required
                        />
                      </label>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {canEdit ? (
          <div className="settings-form__actions">
            <button className="btn btn--primary" type="submit" disabled={isSaving || !persistenceConfigured}>
              {isSaving ? "Ukládám…" : "Uložit nastavení"}
            </button>
            {!persistenceConfigured ? <span className="small muted">Uložení vyžaduje nakonfigurovanou lokální persistenci.</span> : null}
          </div>
        ) : null}
      </form>
    </>
  );
}

function newSettingsMap(settings: readonly StaffingSetting[]): Record<string, string> {
  return Object.fromEntries(
    settings.map((setting) => [settingKey(setting.dayOfWeek, setting.shiftKind), String(setting.requiredEmployees)]),
  );
}

function toPayload(settings: Readonly<Record<string, string>>): StaffingSetting[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) =>
    STAFFING_SHIFT_KINDS.map((shiftKind) => ({
      dayOfWeek,
      shiftKind,
      requiredEmployees: Number(settings[settingKey(dayOfWeek, shiftKind)]),
    })),
  ).flat();
}

function settingKey(dayOfWeek: number, shiftKind: StaffingSetting["shiftKind"]): string {
  return `${dayOfWeek}|${shiftKind}`;
}
