"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import {
  getDefaultStaffingRequirement,
  type StaffingProfileStatus,
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
  | {
      readonly ok: true;
      readonly settings: readonly StaffingSetting[];
      readonly profileStatus: StaffingProfileStatus;
      readonly savedSettingsCount: number;
    }
  | { readonly ok: false; readonly rejected?: { readonly message?: string } };

export function StaffingSettingsForm({
  initialSettings,
  canEdit,
  persistenceConfigured,
  profileStatus,
  savedSettingsCount,
  notice: initialNotice,
}: {
  readonly initialSettings: readonly StaffingSetting[];
  readonly canEdit: boolean;
  readonly persistenceConfigured: boolean;
  readonly profileStatus: StaffingProfileStatus;
  readonly savedSettingsCount: number;
  readonly notice: string | null;
}) {
  const [settings, setSettings] = useState(() => newSettingsMap(initialSettings));
  const [notice, setNotice] = useState<string | null>(initialNotice);
  const [isSaving, setIsSaving] = useState(false);
  const [currentProfileStatus, setCurrentProfileStatus] = useState(profileStatus);
  const [currentSavedSettingsCount, setCurrentSavedSettingsCount] = useState(savedSettingsCount);

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
      setCurrentProfileStatus(data.profileStatus);
      setCurrentSavedSettingsCount(data.savedSettingsCount);
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
          <strong>Počet lidí na směně.</strong> Tato hodnota slouží při přípravě návrhu. Není pracovněprávním pravidlem a rozpis se potvrzuje samostatně.
        </p>
      </div>

      {notice ? <p className="settings-form__notice" role="status">{notice}</p> : null}
      <p className="settings-form__notice" role="note">
        {currentProfileStatus === "complete"
          ? "Načten úplný uložený týdenní profil (14/14 hodnot)."
          : currentProfileStatus === "partial"
            ? `Uloženo ${currentSavedSettingsCount}/14 hodnot. Chybějící buňky jsou doplněny výchozími minimy; před uložením zkontrolujte celou tabulku.`
            : currentProfileStatus === "missing"
              ? "Týdenní profil není uložen. Zobrazená čísla jsou výchozí minima; uložený profil vytvoříte výslovným uložením celé tabulky."
              : "Zdroj uložených hodnot se nepodařilo ověřit. Zobrazená čísla jsou výchozí minima, ne ověřený profil."}
      </p>

      <form className="card settings-form" onSubmit={saveSettings}>
        <div className="card__head">
          <div>
            <h2 className="card__title">Potřebné obsazení směn</h2>
            <p className="card__sub">
              {canEdit ? "Upravte potřebný počet lidí pro jednotlivé směny." : "Počty lidí pro jednotlivé směny."}
            </p>
          </div>
          {canEdit ? null : <span className="settings-form__role">Pouze pro čtení</span>}
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
                          value={settings[settingKey(dayOfWeek, shiftKind)] ?? getDefaultStaffingRequirement(dayOfWeek, shiftKind)}
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
            {!persistenceConfigured ? <span className="small muted">Uložení není v tomto prostředí dostupné.</span> : null}
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
