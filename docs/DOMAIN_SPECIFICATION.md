# Doménová specifikace měsíčního pilotu

**Rozsah:** současný pilot Planning Engine. Platnost potvrzených rozhodnutí řídí [`DOMAIN_DECISIONS.md`](DOMAIN_DECISIONS.md) a pracovní pravidla [`../AGENTS.md`](../AGENTS.md). Dlouhá historická verze specifikace zůstává v [`archive/2026-11-07/DOMAIN_SPECIFICATION.md`](archive/2026-11-07/DOMAIN_SPECIFICATION.md).

Tato specifikace popisuje, co pilot plánuje a kontroluje. Neznamená, že je každá popsaná funkce provozně ověřená; kód a jeho stav ověření uvádí [`ROADMAP.md`](ROADMAP.md).

## Produktový cíl a rozsah

Manažer zadává jeden celý kalendářní měsíc, zaměstnance, potřebné obsazení a dostupné informace o absencích či dostupnosti a získá návrh rozpisu. Hlavním cílem je automatické sestavení použitelného návrhu. Při nejasnosti nebo nedostatku informací se nejistota přizná; aplikace nemá domýšlet hodnoty ani slibovat optimum.

Pilot je určen pro zaměstnance na plný úvazek. Týdenní tabulka je pouze zobrazením části měsíčního návrhu. Částečné úvazky a integrace s dalšími systémy jsou mimo pilot, i pokud je některá související technická část přítomná v kódu.

## Vstupy

- měsíc a zaměstnanci zahrnutí do plánování;
- potřebný počet zaměstnanců podle data a typu směny;
- schválené absence a výslovná dostupnost, pokud jsou pro plán zadány;
- existující potvrzené směny před nebo po měsíci, jsou-li dostupné;
- volitelný pracovní fond, který vytváří neblokující upozornění;
- volné pokyny manažera, které AI může zohledňovat, ale které nejsou samy o sobě deterministicky ověřenými tvrdými pravidly.

Výchozí dostupnost a mapování konkrétních polí aplikace jsou popsány u měsíčního formuláře v kódu. Rozsah a přesná sémantika zadávání volna a časových omezení je otevřená otázka; existující vstupy se bez rozhodnutí nemažou.

## Směny a potvrzená pravidla

| Směna | Čas |
| --- | --- |
| Ranní, všední den i víkend | 07:45–16:30 |
| Odpolední, všední den | 13:15–21:00 |
| Odpolední, víkend | 12:45–21:00 |

1. Pracovním dnem se pro pravidlo šesti dnů počítá kalendářní den s alespoň jednou směnou.
2. Po šesti po sobě jdoucích pracovních dnech musí být nejméně 35 hodin nepřetržitého odpočinku.
3. Kdo pracuje o víkendu, má během stejného týdne dva dny volna. Týden je pondělí–neděle a dny volna nemusí být souvislé.
4. Zaměstnanec nesmí být přiřazen ke směně v době schválené absence nebo výslovné nedostupnosti.
5. Překrývající se přiřazení zaměstnance jsou neplatná.
6. Požadované obsazení je vstup manažera. Minima se nesmějí domýšlet z historických rosterů.
7. Úplnost a návaznosti se kontrolují za celý měsíc. Chybějící historie může dotčené kontroly ponechat jako `not_verified`.

Časy směn jsou potvrzené pro projekt, ale nepředstavují úplný právní výpočet pracovní doby. První verze používá hrubý interval začátku a konce; přestávky nejsou samostatně modelovány.

## Preference a pracovní fond

- Preference střídání ranní/odpolední směny (S6) je nezávazná. Volný text ani jiné preference se automaticky nestávají tvrdými pravidly.
- Pracovní fond lze zadat po zaměstnancích a pro celý měsíc. Odchylka vytváří neblokující nález; chybějící fond se nesmí vydávat za ověřený.
- Přesné měkké váhy a pořadí rozhodování jsou implementační volby, pokud nejsou výslovně potvrzeny jako doménové pravidlo.

## Stavy návrhu a potvrzení

1. **Návrh:** výstup poskytovatele plánování, který může obsahovat mezery nebo nálezy.
2. **Ověření:** samostatná deterministická kontrola celého návrhu. `invalid` znamená nalezené porušení; `not_verified` znamená nedostatek podkladů.
3. **Potvrzení:** výslovná akce manažera. Návrh s blokujícím porušením, neúplností nebo neověřenými povinnými kontrolami nelze potvrdit.

Nenalezení řešení není důkazem matematické neproveditelnosti. Aplikace má sdělit zjištěné překážky a nejistotu; počet chybějících zaměstnanců uvádí pouze tehdy, když je doložen.

## Co není součástí této specifikace

- automatická správa docházky a evidence skutečně odpracovaných hodin;
- samostatný systém žádostí o dovolenou či nemocenskou;
- plánování částečných úvazků v pilotu;
- plánování pouze části měsíce;
- výpočet úplného pracovněprávního souladu včetně přestávek;
- garance matematického optima nebo libovolného porozumění přirozenému jazyku.

## Navazující zdroje

- [`DOMAIN_DECISIONS.md`](DOMAIN_DECISIONS.md) — rozhodnutí a otevřené otázky.
- [`PLAN_OVERENI_AI.md`](PLAN_OVERENI_AI.md) — doložené syntetické běhy AI a jejich meze.
- [`PLANNING_CONTRACT.md`](PLANNING_CONTRACT.md) — starší týdenní kontrakt; není API specifikací měsíčního UI.
- Implementační pravda: `lib/planning/domain/month-validation.ts` a jeho testy.
