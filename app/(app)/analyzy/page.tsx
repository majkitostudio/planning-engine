import type { Metadata } from "next";

import { Icon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePlanningActor } from "@/lib/auth/route-access";
import { readPlanningAudit } from "@/lib/planning/audit-service";
import { getPlanningPersistenceRuntime } from "@/lib/planning/persistence-runtime";

export const metadata: Metadata = {
  title: "Analýzy",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const access = await requirePlanningActor();
  if (!access.ok) {
    return <AnalyticsMessage title="Analýzy nejsou dostupné" message={access.message} />;
  }

  const persistenceRuntime = getPlanningPersistenceRuntime();
  if (!persistenceRuntime.configured) {
    return <AnalyticsMessage title="Analýzy nejsou dostupné" message={persistenceRuntime.reason} />;
  }

  let audit = null;
  try {
    audit = await readPlanningAudit(persistenceRuntime.persistence, access.actor);
  } catch {
    audit = null;
  }

  if (!audit || !audit.ok) {
    return <AnalyticsMessage title="Analýzy nejsou dostupné" message="Přehled potvrzených rozpisů není nyní dostupný." />;
  }

  const confirmed = audit.entries.filter((e) => e.action !== "removed");
  const removed = audit.entries.filter((e) => e.action === "removed");

  return (
    <>
      <div className="page-head">
        <div className="page-head__lead">
          <span className="page-head__icon" aria-hidden="true">
            <Icon name="chart" width={22} height={22} />
          </span>
          <div>
            <h1 className="page-head__title">Analýzy</h1>
            <p className="page-head__sub">Read-only přehled potvrzených rozpisů a jejich základních ukazatelů.</p>
          </div>
        </div>
        <Badge variant="info" dot={false}>READ-ONLY</Badge>
      </div>

      <div className="layout-2col">
        <section className="card" aria-labelledby="analytics-summary">
          <div className="card__head">
            <div>
              <h2 className="card__title" id="analytics-summary">Souhrn</h2>
              <p className="card__sub">Agregáty z potvrzených rozpisů.</p>
            </div>
          </div>
          <dl className="monthly-review-summary">
            <div><dt>Potvrzené rozpisy</dt><dd>{confirmed.length}</dd></div>
            <div><dt>Odstraněné rozpisy</dt><dd>{removed.length}</dd></div>
            <div><dt>Celkem záznamů</dt><dd>{audit.entries.length}</dd></div>
          </dl>
        </section>

        <section className="card" aria-labelledby="analytics-list">
          <div className="card__head">
            <div>
              <h2 className="card__title" id="analytics-list">Potvrzené rozpisy</h2>
              <p className="card__sub">Seznam potvrzených a odstraněných rozpisů.</p>
            </div>
            <Badge variant="neutral" dot={false}>{audit.entries.length}</Badge>
          </div>
          {audit.entries.length === 0 ? (
            <EmptyState icon="chart" title="Zatím žádné záznamy" description="Potvrďte první návrh rozpisu, aby se zde zobrazily ukazatele." />
          ) : (
            <ul className="data-list">
              {audit.entries.map((entry) => (
                <li className="data-row" key={`${entry.proposalId}:${entry.action ?? "confirmed"}:${entry.confirmedAt}`}>
                  <span className="data-row__main">
                    <span className="data-row__title">{entry.month !== undefined ? `Měsíc ${entry.month ?? "neuveden"}` : `Týden od ${entry.weekStart ?? "neuveden"}`}</span>
                    <span className="data-row__sub">{entry.action === "removed" ? "Odstraněno" : "Potvrzeno"}: {entry.confirmedByEmail ?? "neuvedeno"}</span>
                  </span>
                  <span className="data-row__meta">
                    <time dateTime={entry.confirmedAt}>{entry.confirmedAt}</time>
                  </span>
                  <span className="data-row__tag">{entry.proposalId.slice(-6)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function AnalyticsMessage({ title, message }: { title: string; message: string }) {
  return (
    <>
      <div className="page-head">
        <div className="page-head__lead">
          <span className="page-head__icon" aria-hidden="true">
            <Icon name="chart" width={22} height={22} />
          </span>
          <div>
            <h1 className="page-head__title">Analýzy</h1>
            <p className="page-head__sub">Read-only přehled potvrzených rozpisů.</p>
          </div>
        </div>
      </div>
      <EmptyState icon="lock" title={title} description={message} />
    </>
  );
}