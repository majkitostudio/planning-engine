import type { Metadata } from "next";
import Link from "next/link";

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
  title: "Audit rozpisů",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

function modeLabel(mode: string): string {
  switch (mode) {
    case "simulated": return "ukázkový návrh";
    case "gemini": return "AI Gemini";
    case "cloudflare": return "AI Cloudflare";
    default: return mode;
  }
}

export default async function PlanningAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; action?: string; page?: string }>;
}) {
  const params = await searchParams;
  const filterMonth = params.month?.trim() || "";
  const filterAction = params.action === "removed" ? "removed" : params.action === "confirmed" ? "confirmed" : "";
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);

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

  // Enrich with run details (mode, assignment count) — best effort.
  const enriched = await Promise.all(
    audit.entries.map(async (entry) => {
      let mode: string | null = null;
      let assignmentCount: number | null = null;
      try {
        const run = await persistenceRuntime.persistence.getRun(entry.proposalId);
        if (run) {
          mode = run.mode ?? null;
          assignmentCount = run.result?.proposal?.plan?.assignments?.length ?? null;
        }
      } catch {
        // ignore — show what we have
      }
      return { ...entry, mode, assignmentCount };
    }),
  );

  // Filter
  let filtered = enriched;
  if (filterMonth) {
    filtered = filtered.filter((e) => e.month === filterMonth);
  }
  if (filterAction === "confirmed") {
    filtered = filtered.filter((e) => e.action !== "removed");
  } else if (filterAction === "removed") {
    filtered = filtered.filter((e) => e.action === "removed");
  }

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageEntries = filtered.slice(start, start + PAGE_SIZE);

  const months = [...new Set(audit.entries.map((e) => e.month).filter(Boolean))].sort();

  return (
    <>
      <div className="page-head">
        <div className="page-head__lead">
          <span className="page-head__icon" aria-hidden="true">
            <Icon name="clipboard" width={22} height={22} />
          </span>
          <div>
            <h1 className="page-head__title">Audit rozpisů</h1>
            <p className="page-head__sub">
              Historie potvrzení a odstranění měsíčních rozpisů. Nejde o plný audit všech změn.
            </p>
          </div>
        </div>
        <Badge variant="info" dot={false}>
          MANAGER
        </Badge>
      </div>

      <section className="card" aria-labelledby="audit-filters">
        <div className="card__head">
          <div>
            <h2 className="card__title" id="audit-filters">Filtry</h2>
            <p className="card__sub">Filtrujte záznamy podle měsíce a akce.</p>
          </div>
        </div>
        <form method="GET" action="/audit" className="monthly-entry-grid">
          <label>
            Měsíc
            <select className="input" name="month" defaultValue={filterMonth}>
              <option value="">Všechny měsíce</option>
              {months.map((m) => (
                <option key={m} value={m!}>{m}</option>
              ))}
            </select>
          </label>
          <label>
            Akce
            <select className="input" name="action" defaultValue={filterAction}>
              <option value="">Všechny akce</option>
              <option value="confirmed">Potvrzeno</option>
              <option value="removed">Odstraněno</option>
            </select>
          </label>
          <input type="hidden" name="page" value="1" />
          <button type="submit" className="btn btn--secondary">Filtrovat</button>
        </form>
      </section>

      <section className="card" aria-labelledby="audit-list-title">
        <div className="card__head">
          <div>
            <h2 className="card__title" id="audit-list-title">
              Záznamy rozpisů
            </h2>
            <p className="card__sub">Záznam vzniká při potvrzení návrhu nebo odstranění měsíčního rozpisu manažerem.</p>
          </div>
          <Badge variant="neutral" dot={false}>
            {filtered.length}
          </Badge>
        </div>

        {pageEntries.length === 0 ? (
          <EmptyState
            icon="clipboard"
            title="Zatím není co zobrazit"
            description="Dosud nebyl potvrzen žádný návrh plánování, nebo filtr neodpovídá žádnému záznamu."
          />
        ) : (
          <ul className="data-list">
            {pageEntries.map((entry) => (
              <li className="data-row" key={`${entry.proposalId}:${entry.action ?? "confirmed"}:${entry.confirmedAt}`}>
                <span className="step-index" aria-hidden="true">
                  <Icon name="check" width={15} height={15} />
                </span>
                <span className="data-row__main">
                  <span className="data-row__title">{entry.month !== undefined ? `Měsíc ${entry.month ?? "neuveden"}` : `Týden od ${entry.weekStart ?? "neuveden"}`}</span>
                  <span className="data-row__sub">
                    {entry.action === "removed" ? "Odstranil(a)" : "Potvrdil(a)"}: {entry.confirmedByEmail ?? "neuvedeno"}
                    {entry.mode ? ` · režim: ${modeLabel(entry.mode)}` : ""}
                    {entry.assignmentCount !== null ? ` · ${entry.assignmentCount} směn` : ""}
                  </span>
                </span>
                <span className="data-row__meta">
                  <time dateTime={entry.confirmedAt}>{entry.confirmedAt}</time>
                </span>
                <span className="data-row__tag">{entry.proposalId.slice(-6)}</span>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 ? (
          <div className="monthly-step-controls audit-pagination">
            {currentPage > 1 ? (
              <Link className="btn btn--secondary" href={`/audit?${new URLSearchParams({ ...(filterMonth ? { month: filterMonth } : {}), ...(filterAction ? { action: filterAction } : {}), page: String(currentPage - 1) }).toString()}`}>
                Předchozí
              </Link>
            ) : null}
            <span className="audit-pagination__status">
              Strana {currentPage} / {totalPages}
            </span>
            {currentPage < totalPages ? (
              <Link className="btn btn--secondary" href={`/audit?${new URLSearchParams({ ...(filterMonth ? { month: filterMonth } : {}), ...(filterAction ? { action: filterAction } : {}), page: String(currentPage + 1) }).toString()}`}>
                Následující
              </Link>
            ) : null}
          </div>
        ) : null}
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
            <h1 className="page-head__title">Audit rozpisů</h1>
            <p className="page-head__sub">Čtecí pohled nad uloženými potvrzeními.</p>
          </div>
        </div>
      </div>
      <EmptyState icon="lock" title={title} description={message} />
    </>
  );
}
