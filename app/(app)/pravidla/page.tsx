import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pravidla",
};

const CONFIRMED_RULES = [
  ["Časy směn", "Ranní 7:45–16:30 (včetně víkendu), odpolední ve všední den 13:15–21:00, víkendová odpolední 12:45–21:00."],
  ["Odpočinek po šesti dnech", "Po šesti po sobě jdoucích pracovních dnech musí následovat alespoň 35 hodin nepřetržitého odpočinku. Pracovním dnem je kalendářní den s alespoň jednou směnou."],
  ["Víkendová práce", "Zaměstnanec, který pracuje o víkendu, má mít během téhož týdne dva dny volna."],
  ["Schválená absence", "Schválená absence blokuje přiřazení směny."],
  ["Potvrzení manažera", "Bez výslovného potvrzení manažera se návrh neukládá ani neaplikuje jako potvrzený rozpis."],
  ["Částečný návrh", "Částečný nebo neověřený návrh se může zobrazit a projednat, ale nelze jej potvrdit."],
  ["Obsazení", "Potřebné obsazení směn je konfigurovatelný vstup, nikoli historická konstanta."],
  ["Měsíční fond práce", "Naplánovaná doba se porovnává s manažerem zadaným fondem v hodinách. Odchylka i chybějící údaj jsou nezávazné a neblokují potvrzení."],
  ["Přestávky", "Validace používá hrubý interval začátku a konce směny; přestávky ani odpracovaná doba nejsou samostatné tvrdé pravidlo."],
  ["Rozsah pilotu", "První řez podporuje pouze zaměstnance na plný úvazek."],
] as const;

const OPEN_ITEMS = [
  "Role a dovednosti zaměstnanců (H4).",
  "Maximální počet hodin nebo směn za období (H5).",
  "Zamykání přiřazení (H7).",
  "Částečné úvazky (mimo pilot).",
  "Váhy a pořadí měkkých preferencí (S1–S5).",
  "Další pravidla mimo seznam (svátky, jazyky, kontinuita týmu).",
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
            <p className="card__sub">Tato pravidla jsou vynucována deterministickou validací.</p>
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
            <p className="card__sub">Tato témata zatím nejsou schválena a nejsou vynucována.</p>
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
