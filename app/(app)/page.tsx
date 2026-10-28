import Link from "next/link";
import { Icon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { DEMO_ALERTS, DEMO_FREQUENT, DEMO_STATS } from "@/lib/demo-data";

const STEPS = [
  {
    title: "Vyberte týden",
    desc: "Jeden týden od pondělí do neděle, pro který se připraví rozpis.",
    status: "1. krok",
    variant: "info",
  },
  {
    title: "Zkontrolujte vstupy",
    desc: "Zaměstnanci, absence, požadavky a potřebné obsazení směn.",
    status: "2. krok",
    variant: "info",
  },
  {
    title: "Nechte AI připravit návrh",
    desc: "AI navrhne konkrétní přiřazení směn; v této ukázce jde o simulovaný běh.",
    status: "3. krok",
    variant: "info",
  },
  {
    title: "Prohlédněte výsledek",
    desc: "Uvidíte pokrytí směn, změny, upozornění a předpoklady návrhu.",
    status: "4. krok",
    variant: "info",
  },
  {
    title: "Rozhodněte jako manager",
    desc: "Návrh se bez potvrzení managera neuloží ani nepoužije.",
    status: "5. krok",
    variant: "info",
  },
] as const;

export default function DashboardPage() {
  return (
    <>
      <div className="page-head">
        <div className="page-head__lead">
          <span className="page-head__icon" aria-hidden="true">
            <Icon name="dashboard" width={22} height={22} />
          </span>
          <div>
            <h1 className="page-head__title">Přehled</h1>
            <p className="page-head__sub">
              Ukázka týdenního plánování směn pro managera. AI připraví návrh,
              systém ho zkontroluje a poslední rozhodnutí zůstává na člověku.
            </p>
          </div>
        </div>

        <div className="page-head__actions">
          <Link className="btn btn--primary" href="/planovani">
            <Icon name="calendar" width={17} height={17} />
            Otevřít plán směn
          </Link>
        </div>
      </div>

      <div className="demo-notice" role="note">
        <span className="demo-notice__icon" aria-hidden="true">
          <Icon name="info" width={17} height={17} />
        </span>
        <p>
          <strong>Demonstrační data.</strong> Jména, čísla i směny jsou syntetické
          ukázky. Tato ukázka nepracuje s Outlookem ani současným rosterem a
          není produkčním systémem.
        </p>
      </div>

      <div className="stat-grid">
        {DEMO_STATS.map((stat) => (
          <StatCard
            key={stat.key}
            icon={stat.icon}
            tone={stat.tone}
            label={stat.label}
            value={stat.value}
            meta={stat.meta}
            trend={stat.trend}
            detailHref={stat.detail ? "/planovani#upozorneni" : undefined}
          />
        ))}
      </div>

      <div className="layout-2col">
        <div className="plan-main">
          <section className="card" aria-labelledby="dash-steps">
            <div className="card__head">
              <div>
                <h2 className="card__title" id="dash-steps">
                  Jak ukázka funguje
                </h2>
                <p className="card__sub">
                  Od vstupních údajů až po rozhodnutí managera
                </p>
              </div>
              <Badge variant="neutral" dot={false}>
                DEMO
              </Badge>
            </div>
            <ol className="data-list">
              {STEPS.map((step, index) => (
                <li className="data-row" key={step.title}>
                  <span className="step-index" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="data-row__main">
                    <span className="data-row__title">{step.title}</span>
                    <span className="data-row__sub">{step.desc}</span>
                  </span>
                  <Badge variant={step.variant} dot={false}>
                    {step.status}
                  </Badge>
                </li>
              ))}
            </ol>
            <p className="table-note">
              V ukázce si můžete projít celý postup od návrhu až po rozhodnutí
              managera. Některá pravidla a vstupy ještě nejsou pro provoz
              potvrzené.
            </p>
          </section>

          <div className="cta-card">
            <div>
              <p className="cta-card__title">Připraveni ke spuštění plánovacího dema</p>
              <p className="cta-card__text">
                Otevřete pracovní plochu plánu směn s ukázkovou tabulkou,
                výsledkem simulovaného běhu a kontrolou návrhu.
              </p>
            </div>
            <Link className="btn btn--primary" href="/planovani">
              Otevřít plán směn
            </Link>
          </div>
        </div>

        <aside className="plan-rail" aria-label="Přehledy a upozornění">
          <section
            className="card card--alert"
            aria-labelledby="dash-alerts"
          >
            <div className="card__head">
              <div>
                <h2 className="card__title" id="dash-alerts">
                  Aktuální upozornění
                </h2>
                <p className="card__sub">Ukázková data</p>
              </div>
              <Badge variant="danger" dot={false}>
                7
              </Badge>
            </div>
            <div className="alert-list">
              {DEMO_ALERTS.map((alert) => (
                <div className="alert-item" key={alert.label}>
                  <Icon name="alert" width={15} height={15} />
                  <span className="alert-item__label">{alert.label}</span>
                  <span className="alert-item__count">{alert.count}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card" aria-labelledby="dash-frequent">
            <div className="card__head">
              <div>
                <h2 className="card__title" id="dash-frequent">
                  Nejčastější požadavky
                </h2>
                <p className="card__sub">Ukázkové souhrny</p>
              </div>
              <span className="card__head-icon" aria-hidden="true">
                <Icon name="users" width={18} height={18} />
              </span>
            </div>
            <div className="rail-list">
              {DEMO_FREQUENT.map((row) => (
                <div className="rail-row" key={row.label}>
                  <span
                    className={`rail-row__icon rail-row__icon--${row.tone}`}
                    aria-hidden="true"
                  >
                    <Icon name={row.icon} width={15} height={15} />
                  </span>
                  <span className="rail-row__label">{row.label}</span>
                  <span className="rail-row__value">{row.value}</span>
                  <span className={`rail-row__delta delta--${row.trend}`}>
                    {row.delta}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="ai-card" aria-labelledby="dash-ai">
            <div className="ai-card__head">
              <span className="ai-card__icon" aria-hidden="true">
                <Icon name="sparkles" width={16} height={16} />
              </span>
              <h2 className="ai-card__title" id="dash-ai">
                Plánovací asistent
              </h2>
              <Badge variant="warning" dot={false}>
                DEMO / SIMULATED
              </Badge>
            </div>
            <p className="ai-card__text">
              Asistent připraví ukázkový návrh, zobrazí jeho kontrolu a nechá
              managera rozhodnout, zda kompletní návrh potvrdit.
            </p>
            <Link className="btn btn--primary" href="/planovani">
              Otevřít plán směn
            </Link>
          </section>
        </aside>
      </div>
    </>
  );
}
