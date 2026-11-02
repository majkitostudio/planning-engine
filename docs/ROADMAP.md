# Aktuální stav a další kroky — Plánovací Engine

> Stav zdokumentován 3. 11. 2026 podle aktuálního kódu a kontrol dokončených
> v tomto kroku. Vizuální kontrola rozpisu na desktopu a při šířce 390 px je
> ověřena; hlavní měsíční průchod zůstává neověřen.
> Význam stavových popisků vysvětluje [`docs/README.md`](README.md#stavové-popisky).

## Stav MVP

Schváleným směrem je **jeden plán pro celý kalendářní měsíc**. Týdenní tabulka je
jen výřez měsíčního rozpisu. Měsíční formulář, validace, rozhraní API a uložení
návrhu jsou v kódu (`IMPLEMENTED`), ale souvislý měsíční průchod od zadání po
opětovné načtení potvrzeného rozpisu zatím není ověřen (`NOT VERIFIED`).

| Oblast | Aktuální stav |
| --- | --- |
| Měsíční plánovací UI, API a deterministická validace | `IMPLEMENTED`; úplný uživatelský průchod `NOT VERIFIED` |
| Neúplný nebo neověřený návrh | Potvrzení je blokováno (`IMPLEMENTED`; odpovídající pravidlo OQ23 `VERIFIED`) |
| Simulované plánování | `SIMULATED`; fixtures nejsou důkazem kvality plánování AI |
| Gemini adaptér | `IMPLEMENTED`; kvalita měsíčního výstupu pro provoz `NOT VERIFIED` |
| Ochrana údajů před Gemini | Anonymizace jmen a interních identifikátorů před odesláním `IMPLEMENTED`; unit test ověřil anonymní request a lokální obnovu ID |
| Přihlášení a role | Lokální/Auth.js MVP přístup `IMPLEMENTED`; produkční autentizace `NOT VERIFIED`; Entra `PLANNED` |
| Přihlášení a čtení měsíčních dat | Lokální přihlášení a načtení měsíčních dat ověřeno v připojeném testovacím prostředí (`VERIFIED`); žádný návrh nebyl vytvořen ani potvrzen |
| Databáze a persistence | Prisma persistence `IMPLEMENTED`; dřívější ověření lokální Docker DB platí pro tehdejší prostředí; produkční databáze `NOT VERIFIED` |
| Přehledová stránka | Pevné neprovozní souhrny odstraněny; lint, typecheck a build prošly |
| Měsíční kalendář a formulář | Rozložení `IMPLEMENTED`; desktop a šířka 390 px vizuálně ověřeny (`VERIFIED`); styl sekundárních tlačítek opraven a ověřen; hlavní tok `NOT VERIFIED` |
| Mobilní správa účtů | Úprava rozložení `IMPLEMENTED`; vizuální kontrola `NOT VERIFIED` |

Kontroly po poslední změně: `npm run lint`, `npm run typecheck`, `npm run test`
(363 prošlo, 3 přeskočeny) a `npm run build` prošly. `npm run db:validate`
prošel při předchozím ověřování; tato změna schématu Prisma se nedotkla.
Integrační testy Gemini a PostgreSQL nebyly spuštěny. Přihlášení a načtení
měsíčního endpointu proběhlo v připojeném lokálním testovacím prostředí; žádný
návrh nebyl zapsán ani potvrzen.

## Rozlišení dat

- **Lokální testovací prostředí obsahuje skutečné záznamy zaměstnanců vložené
  uživatelem.** Nejsou syntetická, nemažou se ani neupravují v rámci tohoto úkolu.
- Syntetické fixtures v `lib/demo-data.ts` jsou samostatné předpřipravené
  ukázkové záznamy používané některými částmi ukázkového UI a testů. Nejsou
  exportem ani kopií uložených zaměstnanců.
- Simulovaný provider vrací připravené scénáře; jeho označení `SIMULATED` se
  zachovává. Výsledek se nesmí vydávat za skutečný výpočet AI.
- Při volání externího Gemini API serverový adaptér nahrazuje jména, interní
  zaměstnanecká ID a ID absencí anonymními štítky. Po odpovědi převádí ID návrhu
  zpět pouze na serveru. Volný text instrukcí se před odesláním zbaví přesných
  výskytů jmen a interních ID. Cílený unit test ověřil anonymizovaný požadavek
  i obnovu ID v odpovědi; skutečné záznamy se pro integrační scénáře nepoužívají.

## Další postup před hlavním průchodem

1. V Chrome byla ověřena měsíční osa a formulář při výchozí šířce i při 390 px.
   Formulář se na mobilu skládá pod sebe a kalendář lze vodorovně posouvat.
   Sekundární tlačítka nyní používají kontrastní barvy. V UI nebyl vybrán žádný
   zaměstnanec a žádný plánovací zápis nebyl proveden.
2. Následuje hlavní uživatelský průchod. Před vytvořením návrhu určit testovací
   měsíc a potvrdit, že test používá vhodná data a provider. Skutečná jména
   zaměstnanců se nesmějí odesílat externímu AI provideru; návrh se nesmí potvrdit
   bez výslovného ověření cílového prostředí a výsledku.
3. Samostatně zaznamenat, které části průchodu byly `VERIFIED`; simulovaný běh
   nepotvrzuje kvalitu plánování AI ani produkční připravenost.
4. Poté vizuálně projít mobilní správu účtů, chybové stavy a fokus klávesnice.

## Rozhodnutí, která zůstávají závazná

- AI je hlavní logika plánování; deterministická validace nezávisle ověřuje jen
  potvrzená pravidla. Ani AI, ani validace návrh neschvalují.
- Manažer rozhoduje o potvrzení. Návrh, validovaný návrh a potvrzený rozpis jsou
  rozdílné stavy.
- Volný text je pokyn pro AI, nikoli automaticky deterministicky ověřované
  pravidlo.
- Chybějící historii nebo podklady označit jako neověřené; neúplný návrh nelze
  potvrdit.
- Pilotní rozsah tvoří zaměstnanci na plný úvazek a celý kalendářní měsíc.
  Produkční autentizace, produkční databáze, částečné úvazky a CRM integrace jsou
  mimo aktuální ověření.

Podrobnější doménová rozhodnutí jsou v [`DOMAIN_DECISIONS.md`](DOMAIN_DECISIONS.md),
schválený směr rozhraní v historickém návrhu
[`docs/superpowers/specs/2026-10-30-mesicni-mvp-design.md`](superpowers/specs/2026-10-30-mesicni-mvp-design.md)
a vysvětlení stavových popisků v [`docs/README.md`](README.md#stavové-popisky).
