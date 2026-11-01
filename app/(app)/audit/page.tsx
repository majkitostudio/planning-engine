import type { Metadata } from "next";

import { Icon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePlanningActor } from "@/lib/auth/route-access";
import {
  readPlanningAudit,
  type PlanningAuditResult,
} from "@/lib/planning/audit-service";
import { getPlanningPersistenceRuntime } from "@/lib/planning/persistence-runtime";

export const metadata: Metadata = {
  title: "Audit potvrzení",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PlanningAuditPage() {
  const actorAccess = await requirePlanningActor();

  if (!actorAccess.ok) {
    return <AuditMessage title="Audit není dostupný" message={actorAccess.message} />;
  }

  const persistenceRuntime = getPlanningPersistenceRuntime();
  if (!persistenceRuntime.configured) {
    return <AuditMessage title="Audit není dostupný" message={persistenceRuntime.reason} />;
  }

  let audit: PlanningAuditResult | null = null;
  try {
    audit = await readPlanningAudit(persistenceRuntime.persistence, actorAccess.actor);
  } catch {
    audit = null;
  }

  if (!audit) {
    return (
      <AuditMessage
        title="Audit se nepodařilo načíst"
        message="Záznamy potvrzení nejsou nyní dostupné. Zkuste akci později."
      />
    );
  }

  if (!audit.ok) {
    return (
      <AuditMessage
        title="Přístup odepřen"
        message="Auditní záznamy jsou v tomto prvním řezu dostupné pouze managerovi."
      />
    );
  }

  return (
    <>
      <div className="page-head">
        <div className="page-head__lead">
          <span className="page-head__icon" aria-hidden="true">
            <Icon name="clipboard" width={22} height={22} />
          </span>
          <div>
            <h1 className="page-head__title">Audit potvrzení</h1>
            <p className="page-head__sub">
              Historie již potvrzených návrhů. Nejde o plný audit všech změn.
            </p>
          </div>
        </div>
        <Badge variant="info" dot={false}>
          MANAGER
        </Badge>
      </div>

      <section className="card" aria-labelledby="audit-list-title">
        <div className="card__head">
          <div>
            <h2 className="card__title" id="audit-list-title">
              Potvrzené návrhy
            </h2>
            <p className="card__sub">Záznam vzniká až po výslovném potvrzení managerem.</p>
          </div>
          <Badge variant="neutral" dot={false}>
            {audit.entries.length}
          </Badge>
        </div>

        {audit.entries.length === 0 ? (
          <EmptyState
            icon="clipboard"
            title="Zatím není co zobrazit"
            description="Dosud nebyl potvrzen žádný návrh plánování."
          />
        ) : (
          <ul className="data-list">
            {audit.entries.map((entry) => (
              <li className="data-row" key={entry.proposalId}>
                <span className="step-index" aria-hidden="true">
                  <Icon name="check" width={15} height={15} />
                </span>
                <span className="data-row__main">
                  <span className="data-row__title">{entry.month !== undefined ? `Měsíc ${entry.month ?? "neuveden"}` : `Týden od ${entry.weekStart ?? "neuveden"}`}</span>
                  <span className="data-row__sub">
                    Potvrdil(a): {entry.confirmedByEmail ?? "neuvedeno"}
                  </span>
                </span>
                <span className="data-row__meta">
                  <time dateTime={entry.confirmedAt}>{entry.confirmedAt}</time>
                </span>
                <span className="data-row__tag">{entry.proposalId}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function AuditMessage({ title, message }: { title: string; message: string }) {
  return (
    <>
      <div className="page-head">
        <div className="page-head__lead">
          <span className="page-head__icon" aria-hidden="true">
            <Icon name="clipboard" width={22} height={22} />
          </span>
          <div>
            <h1 className="page-head__title">Audit potvrzení</h1>
            <p className="page-head__sub">Čtecí pohled nad uloženými potvrzeními.</p>
          </div>
        </div>
      </div>
      <EmptyState icon="lock" title={title} description={message} />
    </>
  );
}
