import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge, type BadgeVariant } from "@/components/ui/badge";

type Step = {
  title: string;
  status: string;
  variant: BadgeVariant;
  description: string;
  meta: string[];
};

const STEPS: Step[] = [
  {
    title: "Výběr plánovacího období",
    status: "Připraveno k návrhu",
    variant: "info",
    description:
      "Určete kalendářní měsíc, na který se sestavuje rozpis směn.",
    meta: ["Vstup: měsíc a rok"],
  },
  {
    title: "Příprava nebo načtení vstupních dat",
    status: "Připraveno k návrhu",
    variant: "info",
    description:
      "Načtěte zaměstnance, jejich dostupnost, směny a plánovací pravidla.",
    meta: ["Vstup: seznamy a kapacity"],
  },
  {
    title: "Spuštění plánování",
    status: "Blokováno",
    variant: "warning",
    description:
      "Vyžaduje úplná vstupní data a implementovanou plánovací logiku.",
    meta: ["Závisí na: kroky 1–2", "Plánovací logika: není implementována"],
  },
  {
    title: "Zobrazení navrženého rozpisu",
    status: "Blokováno",
    variant: "warning",
    description:
      "Návrh rozpisu se zobrazí po spuštění plánování.",
    meta: ["Závisí na: krok 3"],
  },
  {
    title: "Kontrola konfliktů a nepokrytých směn",
    status: "Blokováno",
    variant: "warning",
    description:
      "Po zkontrolování je možné rozpis upravit a plánování znovu spustit.",
    meta: ["Závisí na: krok 4"],
  },
];

export default function PlanningPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <p className="page-header__eyebrow">Plánovací engine · Pracovní plocha</p>
          <h1 className="page-header__title">Pracovní plocha plánování</h1>
          <p className="page-header__desc">
            Pětikrokový postup pro sestavení měsíčního rozpisu směn. Jedná se o
            návrh struktury pracovního postupu, ne o provozní pravidla.
          </p>
        </div>
        <Badge variant="warning" dot={false}>
          Struktura workflow
        </Badge>
      </div>

      <div className="stack-lg">
        <Alert variant="warning">
          <strong>Workflow je návrhem struktury.</strong> Kroky zatím nejsou
          provázány na vstupní data ani plánovací logiku — nejde o schválená
          provozní pravidla.
        </Alert>

        <div className="steps">
          {STEPS.map((step, index) => (
            <div className="step" key={step.title}>
              <span
                className={`step__index${
                  step.variant === "info" ? " step__index--ready" : " step__index--blocked"
                }`}
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <div className="step__body">
                <div className="step__head">
                  <h2 className="step__title">{step.title}</h2>
                  <Badge variant={step.variant} dot={false}>
                    {step.status}
                  </Badge>
                </div>
                <p className="step__desc">{step.description}</p>
                <div className="step__meta">
                  {step.meta.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="summary">
          <div>
            <p className="summary__label">Před spuštěním plánování</p>
            <p className="summary__value">
              Chybí vstupní data a plánovací logika
            </p>
          </div>
          <Link className="btn btn--ghost" href="/">
            Zpět na přehled
          </Link>
        </div>
      </div>
    </>
  );
}
