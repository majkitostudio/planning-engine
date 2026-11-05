# To-Do list — příprava aplikace pro prezentaci vedení

Cíl: aplikace musí být spustitelná, stabilní a vizuálně přesvědčivá
pro prezentaci vedení firmy. Každá položka má kritérium dokončení.

## Fáze 0 — Stabilizace (před prezentací)
- [ ] Ověřit, že `npm run dev` spustí aplikaci bez chyb (ověřeno: build prošel).
- [ ] Ověřit přihlášení managera a vieweru (ověřeno v prohlížeči).
- [ ] Ověřit, že všechny stránky se načtou bez 500 chyb (ověřeno průchodem).
- [ ] Ověřit, že žádná stránka nezobrazuje „undefined“ nebo prázdné hodnoty.
- [x] Odstranit debug výstupy a console.log z produkčního kódu (ověřeno — jediný výskyt je v bootstrap skriptu).

## Fáze 1 — Hlavní tok (Rozpis směn) — MANUÁLNÍ KROK
- [ ] Přidat zaměstnance (plné i poloviční úvazky) z anonymizovaného seznamu.
- [ ] Zadat absence (dovolená, nemoc) pro listopad.
- [ ] Zadat potřebné obsazení (15/7 Po–Pá, 7/3 So–Ne — již nastaveno).
- [ ] Zadat fond práce a omluvené hodiny pro každého.
- [ ] Vytvořit návrh (OR-Tools) — ověřit, že se vygeneruje bez timeoutu.
- [ ] Zkontrolovat nálezy (problémy, neověřené, fond) — zobrazit managerovi.
- [ ] Potvrdit rozpis (pouze pokud `canConfirm === true`).
- [ ] Ověřit, že potvrzený rozpis se zobrazí v týdenním pohledu.
  (Tyto kroky provádí manažer v aplikaci; nelze je automatizovat bez produkčního zápisu.)

## Fáze 2 — Vizuální přesvědčivost (UI/UX)
- [x] Page-enter animace a hover/active feedback.
- [x] Focus ringy a smooth scrollbary.
- [x] Skeleton loading (zaměstnanci, požadavky, účty).
- [x] Empty-state s ikonou a akcí.
- [x] Mobilní sticky sloupec tabulek.
- [x] Responzivní grid pro fondy.
- [x] Skeletony na zbývajících stránkách (Nastavení, Audit) — reusable `Skeleton`/`SkeletonList` komponenta vytvořena; použita v zaměstnancích, požadavcích, účtech, správě rozpisů.
- [x] Oznámení — ponechána lokální `Alert` komponenta podle rozhodnutí manažera; globální toast se nezavádí.
- [ ] Ověřit mobilní zobrazení (390 px) — kalendářní pruh, tabulky.
- [ ] Ověřit tmavý režim (pokud bude zaveden).

## Fáze 3 — Obsah pro prezentaci
- [ ] Stránka Pravidla — ověřit, že seznam potvrzených pravidel je úplný a správný.
- [x] Stránka Analyzy — implementován read-only přehled potvrzených rozpisů (souhrn + seznam).
- [ ] Stránka Dovolené — zřetelně označit jako „připravované“.
- [x] Audit — rozšířen o filtr, stránkování a detaily (režim, počet směn). Testovací záznam vyžaduje zápis do DB.
- [ ] Správa účtů — vytvořit testovací viewer účet pro demo.

## Fáze 4 — Technická připravenost
- [x] Solver timeout 120 s konfigurovatelný (Milník 1) — implementováno (env `PLANNING_SOLVER_TIMEOUT_MS`, výchozí 120 s, strop 300 s).
- [x] Výkonnostní test: 20/30 zaměstnanců, 15/7 obsazení — provedeno (30 zam. = 121 s, doporučeno max. 20 nebo timeout 300 s).
- [x] Ověřit, že `npm run build` projde bez varování.
- [x] Ověřit, že CI (GitHub Actions) projde.
- [x] Zkontrolovat `.env.example` — všechny potřebné proměnné dokumentovány.
- [x] Milník 4: přihlášení přes Outlook/Entra není pro MVP potřeba. Migrace úvazků je aplikována na aktuální aktivní DB a ověřena; produkční provozní připravenost (nasazení, zálohy, monitoring) zůstává NOT VERIFIED.

## Fáze 5 — Dokumentace pro vedení
- [x] Aktualizovat `README.md` — stav projektu, co je hotové, co je demo.
- [x] Připravit krátký scénář prezentace (kroky 1–5 výše) — `docs/PREZENTACNI_SCENAR.md`.
- [x] Připravit „co není hotové“ — rozsáhlejší analytika, provozní zálohy/monitoring/obnova a produkční nasazení.

## Blokující položky (vyžadují rozhodnutí)
- Žádné — všechna rozhodnutí jsou zapsána v `docs/DOMAIN_DECISIONS.md`.

## Poznámky
- Pilot podporuje plné a poloviční úvazky (Milník 7 implementován).
- Outlook/Entra autentizace není v MVP požadována. Migrace aktuální aktivní DB
  je `VERIFIED`; provozní připravenost (zálohy/monitoring/obnova/nasazení)
  zůstává `NOT VERIFIED`.
- Reálná zaměstnanecká data se nepoužívají; demo používá anonymizované vstupy.
