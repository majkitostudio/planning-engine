import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pravidla",
};

const CONFIRMED_RULES = [
  ["Časy směn", "Pilot používá plné úvazky: ranní 7:45–16:30, odpolední ve všední den 13:15–21:00, víkendová odpolední 12:45–21:00. Poloviční úvazky jsou v kódu připravené, ale mimo pilot."],
  ["Odpočinek po šesti dnech", "Po šesti po sobě jdoucích pracovních dnech musí následovat alespoň 35 hodin nepřetržitého odpočinku. Pracovním dnem je kalendářní den s alespoň jednou směnou."],
  ["Víkendová práce", "Zaměstnanec, který pracuje o víkendu, má mít během téhož týdne dva dny volna. Týden se počítá pondělí–neděle."],
  ["Schválená absence", "Schválená absence blokuje přiřazení směny."],
  ["Potvrzení manažera", "Nepotvrzený návrh lze uložit k posouzení, ale bez výslovného potvrzení manažera se nesmí aplikovat jako potvrzený rozpis."],
  ["Částečný návrh", "Částečný nebo neověřený návrh se může zobrazit a projednat, ale nelze jej potvrdit."],
  ["Obsazení", "Potřebné obsazení směn je konfigurovatelný vstup. Nedostatečné pokrytí se musí přiznat; neúplný návrh nelze potvrdit."],
  ["Měsíční fond práce", "Naplánovaná doba se porovnává s manažerem zadaným fondem v hodinách. Odchylka i chybějící údaj jsou nezávazné a neblokují potvrzení."],
  ["Přestávky", "Validace používá hrubý interval začátku a konce směny; přestávky ani odpracovaná doba nejsou samostatné tvrdé pravidlo."],
  ["Role a limity", "Role ani dovednosti se neevidují, další tvrdé limity počtu hodin či směn nejsou schváleny a přiřazení nelze zamykat."],
  ["Střídání směn", "Manažer může zapnout měkké přání střídat ranní a odpolední směny mezi sousedními pracovními směnami. Nejde o tvrdé pravidlo."],
  ["Operativní náhrada", "Náhrada se týká celé pevné směny; směna se neprodlužuje, nezkracuje ani nedělí a přesčasy se nepoužívají."],
] as const;

const OPEN_ITEMS = [
  "Externí AI je povolená a smí dostávat skutečná jména i volný text. Měsíční plánování zajišťuje Cloudflare Workers AI s nulovým uchováváním; reálné volání a kvalita výstupu se teprve ověřují.",
  "AI může přihlédnout k volnému textu, ale jeho splnění nezávislá kontrola neověří. Volný text zůstává pokyn, ne tvrdé pravidlo.",
  "Kvalita plánování, produkční zabezpečení a online nasazení nejsou ověřené. Cílem je nekomerční Vercel Hobby se stávající Neon databází, ne produkční systém.",
  "Doba uchování a mazání volného textu v databázi zatím nejsou potvrzené.",
];

export default function RulesPage() {
  return (
    <>
      <div className="page-head">
        <div className="page-head__lead">
          <div>
            <h1 className="page-head__title">Pravidla</h1>
            <p className="page-head__sub">
              Potvrzená pravidla, ze kterých engine vychází. Otevřené otázky
              zůstávají výslovně označené.
            </p>
          </div>
        </div>
      </div>

      <section className="card" aria-labelledby="confirmed-rules">
        <div className="card__head">
          <div>
            <h2 className="card__title" id="confirmed-rules">Potvrzená pravidla</h2>
            <p className="card__sub">Jde o potvrzená rozhodnutí projektu; upozornění a měkké preference nejsou tvrdá pravidla.</p>
          </div>
        </div>
        <div className="monthly-review-summary">
          <dl>
            {CONFIRMED_RULES.map(([title, description]) => (
              <div key={title}>
                <dt>{title}</dt>
                <dd>{description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="card" aria-labelledby="open-rules">
        <div className="card__head">
          <div>
            <h2 className="card__title" id="open-rules">Otevřené otázky</h2>
          <p className="card__sub">Tato omezení a otevřené předpoklady musí zůstat viditelné; nejsou potvrzením připravenosti k produkčnímu použití.</p>
          </div>
        </div>
        <ul className="monthly-entry-list">
          {OPEN_ITEMS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
