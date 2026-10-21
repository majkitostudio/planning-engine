import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Def } from "@/components/ui/def";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/icons";

const INPUT_ITEMS = [
  "Seznam zaměstnanců",
  "Dostupnost zaměstnanců",
  "Směny a šablony",
  "Pravidla a preference",
] as const;

export default function DashboardPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <p className="page-header__eyebrow">Plánovací engine · Přehled</p>
          <h1 className="page-header__title">Přehled plánování</h1>
          <p className="page-header__desc">
            Pracovní přehled pro sestavování měsíčních rozpisů směn zaměstnanců
            call centra. Zatím nejsou připravena žádná vstupní data ani plán.
          </p>
        </div>
        <Badge variant="neutral" dot={false}>
          Období není vybráno
        </Badge>
      </div>

      <div className="stack-lg">
        <Alert>
          <strong>Demonstrační prostředí.</strong> Aplikace zatím nemá
          připojení k databázi ani plánovací logiku. Hodnoty zde jsou prázdné
          nebo čekají na vstupní data.
        </Alert>

        <div className="grid grid--2">
          <section className="card" aria-labelledby="card-period">
            <div className="card__header">
              <div>
                <h2 className="card__title" id="card-period">
                  Plánovací období
                </h2>
                <p className="card__sub">
                  Kalendářní měsíc, na který se sestavuje rozpis
                </p>
              </div>
              <Badge variant="neutral" dot={false}>
                Nez vybráno
              </Badge>
            </div>
            <div className="card__body">
              <EmptyState
                icon="calendar"
                title="Nebylo vybráno žádné období"
                description="Pro přípravu rozpisu nejprve vyberte kalendářní měsíc."
                action={
                  <button
                    className="btn btn--ghost btn--sm"
                    type="button"
                    aria-disabled="true"
                    title="Připravované — výběr období zatím není provázán se vstupními daty"
                  >
                    Vybrat období
                  </button>
                }
              />
            </div>
            <div className="card__footer">
              Výběr období bude k dispozici po navázání vstupních dat.
            </div>
          </section>

          <section className="card" aria-labelledby="card-progress">
            <div className="card__header">
              <div>
                <h2 className="card__title" id="card-progress">
                  Stav přípravy rozpisu
                </h2>
                <p className="card__sub">Průběh pracovního postupu plánování</p>
              </div>
              <Badge variant="neutral" dot={false}>
                Nezahájeno
              </Badge>
            </div>
            <div className="card__body">
              <div
                className="progress"
                role="img"
                aria-label="Dokončeno 0 z 5 kroků"
              >
                {[0, 1, 2, 3, 4].map((segment) => (
                  <span className="progress__seg" key={segment} />
                ))}
              </div>
              <div className="defs">
                <Def label="Dokončené kroky">
                  <span className="mono">0 / 5</span>
                </Def>
                <Def label="Navrhovaný rozpis" muted>
                  Zatím žádný
                </Def>
                <Def label="Konflikty" muted>
                  Není co kontrolovat
                </Def>
              </div>
            </div>
          </section>
        </div>

        <div className="grid grid--2">
          <section className="card" aria-labelledby="card-inputs">
            <div className="card__header">
              <div>
                <h2 className="card__title" id="card-inputs">
                  Vstupní data a připravenost
                </h2>
                <p className="card__sub">
                  Co je třeba připravit před sestavením rozpisu
                </p>
              </div>
              <Badge variant="neutral" dot={false}>
                Nepřipraveno
              </Badge>
            </div>
            <div className="card__body">
              <div className="defs">
                {INPUT_ITEMS.map((item) => (
                  <Def key={item} label={item}>
                    <Badge variant="neutral" dot={false}>
                      Nepřipraveno
                    </Badge>
                  </Def>
                ))}
              </div>
            </div>
            <div className="card__footer">
              Data se budou načítat z databáze po navázání doménového modelu.
            </div>
          </section>

          <section className="card" aria-labelledby="card-conflicts">
            <div className="card__header">
              <div>
                <h2 className="card__title" id="card-conflicts">
                  Konflikty a nepokryté směny
                </h2>
                <p className="card__sub">
                  Kontrola výsledku po sestavení rozpisu
                </p>
              </div>
              <Badge variant="neutral" dot={false}>
                Není co kontrolovat
              </Badge>
            </div>
            <div className="card__body">
              <EmptyState
                icon="check"
                title="Zatím nelze kontrolovat"
                description="Kontrola konfliktů je k dispozici až po vygenerování návrhu rozpisu."
              />
            </div>
          </section>
        </div>

        <div className="summary">
          <div>
            <p className="summary__label">Pracovní prostor plánování</p>
            <p className="summary__value">Připraven k navrhování</p>
          </div>
          <Link className="btn btn--primary" href="/planovani">
            <Icon name="calendar" width={16} height={16} aria-hidden="true" />
            Otevřít pracovní plochu
          </Link>
        </div>
      </div>
    </>
  );
}
