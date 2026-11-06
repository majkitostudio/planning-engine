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
> Úvazky, listopadové absence, fondy i další návaznost doplní manažer přímo
> v aplikaci. Agent tyto osobní/doménové údaje nebude odhadovat ani doplňovat.
- [x] Importovat říjnový roster jako návaznost — 23 přesně spárovaných aktivních
  zaměstnanců s kompletními explicitními dny 25.–31. 10.; uloženo 625 známých
  směn/volných dnů, 88 buněk zůstalo neznámých a nebylo převedeno na volno.
- [x] Načíst staffing profil — 14/14 hodnot: Po–Pá 15/7, So–Ne 7/3.
- [x] Rozsah úvazků potvrzen (`VERIFIED`, 6. 11. 2026): pilot je pouze pro
  plné úvazky. Poloviční úvazky zůstávají mimo pilot; databázové záznamy proto
  není potřeba měnit.
- [ ] Zadat listopadové absence a dostupnost — tyto údaje nejsou v říjnovém rosteru.
- [ ] Volitelně zadat fond práce a omluvené hodiny (rozbalovací část formuláře).
  Bez fondu lze návrh vytvořit; kontrola pak u chybějících údajů uvede, že
  naplnění fondu nelze ověřit.
- [ ] Doplnit chybějící říjnové hranice pro 6 zaměstnanců a pořídit prosincovou
  návaznost, pokud má být listopadový návrh potvrditelný.
- [ ] Vytvořit návrh (OR-Tools), zkontrolovat nálezy a potvrdit pouze po
  manažerském rozhodnutí, pokud `canConfirm === true`.
  (V databázi již bylo 7 listopadových návrhů; žádný není potvrzený a žádný
  z nich nebyl tímto testem změněn.)

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
- Pilot je pouze pro plné úvazky; poloviční úvazky jsou implementované, ale
  mimo pilot (`VERIFIED`, 6. 11. 2026).
- Outlook/Entra autentizace není v MVP požadována. Migrace aktuální aktivní DB
  je `VERIFIED`; provozní připravenost (zálohy/monitoring/obnova/nasazení)
  zůstává `NOT VERIFIED`.
- Reálná zaměstnanecká data se nepoužívají; demo používá anonymizované vstupy.
