# Aktuální stav a další kroky — Plánovací Engine

> Stav zdokumentován 2. 11. 2026 podle aktuálního kódu a kontrol dokončených
> v tomto kroku. Plný měsíční průchod a vizuální kontrola v prohlížeči ověřeny
> nebyly.
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
| Databáze a persistence | Prisma persistence `IMPLEMENTED`; lokální Docker ověření z dřívějšího pilotu je omezené na jeho tehdejší prostředí; současné připojení ani produkční databáze nejsou tímto krokem ověřeny (`NOT VERIFIED`) |
| Přehledová stránka | Pevné neprovozní souhrny odstraněny; lint, typecheck a build prošly |
| Mobilní účty a měsíční formulář | Úprava rozložení `IMPLEMENTED`; vizuální kontrola na úzké šířce `NOT VERIFIED`, lokální web odmítl spojení na `localhost:3012` |

Závěrečné kontroly: `npm run lint`, `npm run typecheck`, `npm run test`
(363 prošlo, 3 přeskočeny), `npm run build` a `npm run db:validate` prošly.
Integrační testy Gemini a PostgreSQL nebyly spuštěny; nebyla otevřena databáze
ani externí AI služba.

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

1. Spustit rozhraní v potvrzeném lokálním testovacím prostředí a dokončit
   vizuální kontrolu, která nyní nešla provést, protože `localhost:3012` odmítl
   spojení.
2. Na úzké šířce a desktopu ověřit kalendář měsíce, vícekrokový formulář,
   obsazení směn, mobilní správu účtů, stavy chyb a viditelný fokus.
3. Teprve potom naplánovat hlavní uživatelský průchod přes již nakonfigurované
   prostředí. Před každým zápisem ověřit, že cílová databáze a měsíc jsou určené
   pro test; nepoužít produkční služby ani skutečné údaje zaměstnanců pro AI.
4. Samostatně zaznamenat, které části průchodu byly `VERIFIED`; simulovaný běh
   nepotvrzuje kvalitu AI ani produkční připravenost.

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
