import Link from "next/link";
import { Icon } from "@/components/icons";

const STEPS = [
  ["Vyberte měsíc", "Zvolte jeden celý kalendářní měsíc."],
  ["Doplňte vstupy", "Zaměstnanci, absence, dostupnost a potřebné obsazení."],
  ["Vytvořte návrh", "Podle zadaných zaměstnanců, nepřítomností, dostupnosti a obsazení."],
  ["Zkontrolujte výsledek", "Validace a chybějící podklady jsou zobrazené samostatně."],
  ["Rozhodněte", "Návrh se bez potvrzení manažera nestane rozpisem."],
] as const;

const SECTIONS = [
  ["/zamestnanci", "Zaměstnanci"], ["/pozadavky", "Požadavky"],
  ["/dovolene", "Dovolené a absence"], ["/pravidla", "Pravidla"],
  ["/analyzy", "Analýzy"], ["/nastaveni", "Nastavení"],
] as const;

export default function DashboardPage() {
  return <>
    <div className="page-head">
      <div className="page-head__lead">
        <span className="page-head__icon" aria-hidden="true"><Icon name="dashboard" width={22} height={22} /></span>
        <div><h1 className="page-head__title">Přehled</h1><p className="page-head__sub">Měsíční plán směn je hlavní pracovní tok. Vyberte období a připravte návrh.</p></div>
      </div>
      <div className="page-head__actions"><Link className="btn btn--primary" href="/planovani"><Icon name="calendar" width={17} height={17} />Otevřít měsíční rozpis</Link></div>
    </div>
    <div className="layout-2col dashboard-layout">
      <section className="card" aria-labelledby="dash-steps">
        <div className="card__head"><div><h2 className="card__title" id="dash-steps">Postup měsíčního plánování</h2><p className="card__sub">Jeden návrh pro celý kalendářní měsíc</p></div></div>
        <ol className="data-list">{STEPS.map(([title, description], index) => <li className="data-row" key={title}><span className="step-index" aria-hidden="true">{index + 1}</span><span className="data-row__main"><span className="data-row__title">{title}</span><span className="data-row__sub">{description}</span></span></li>)}</ol>
      </section>
      <aside className="plan-rail" aria-label="Další části aplikace">
        <section className="card" aria-labelledby="dash-sections">
          <div className="card__head"><div><h2 className="card__title" id="dash-sections">Další části aplikace</h2><p className="card__sub">Odkazy zůstávají dostupné i v navigaci</p></div><span className="card__head-icon" aria-hidden="true"><Icon name="dashboard" width={18} height={18} /></span></div>
          <ul className="dashboard-links">{SECTIONS.map(([href, label]) => <li key={href}><Link href={href}><span>{label}</span><Icon name="chevronRight" width={15} height={15} /></Link></li>)}</ul>
        </section>
      </aside>
    </div>
  </>;
}
