# To-Do list — příprava aplikace pro prezentaci vedení

Cíl: aplikace musí být spustitelná, stabilní a vizuálně přesvědčivá
pro prezentaci vedení firmy. Každá položka má kritérium dokončení.

## Fáze 0 — Stabilizace (před prezentací)
- [ ] Ověřit, že `npm run dev` spustí aplikaci bez chyb (ověřeno: build prošel).
- [ ] Ověřit přihlášení managera a vieweru (ověřeno v prohlížeči).
- [ ] Ověřit, že všechny stránky se načtou bez 500 chyb (ověřeno průchodem).
- [ ] Ověřit, že žádná stránka nezobrazuje „undefined“ nebo prázdné hodnoty.
- [ ] Odstranit debug výstupy a console.log z produkčního kódu (ověřit).

## Fáze 1 — Hlavní tok (Rozpis směn)
- [ ] Přidat zaměstnance (plné úvazky) z reálného seznamu (anonymizované).
- [ ] Zadat absence (dovolená, nemoc) pro listopad.
- [ ] Zadat potřebné obsazení (15/7 Po–Pá, 7/3 So–Ne — již nastaveno).
- [ ] Zadat fond práce a omluvené hodiny pro každého.
- [ ] Vytvořit návrh (OR-Tools) — ověřit, že se vygeneruje bez timeoutu.
- [ ] Zkontrolovat nálezy (problémy, neověřené, fond) — zobrazit managerovi.
- [ ] Potvrdit rozpis (pouze pokud `canConfirm === true`).
- [ ] Ověřit, že potvrzený rozpis se zobrazí v týdenním pohledu.

## Fáze 2 — Vizuální přesvědčivost (UI/UX)
- [x] Page-enter animace a hover/active feedback.
- [x] Focus ringy a smooth scrollbary.
- [x] Skeleton loading (zaměstnanci, požadavky, účty).
- [x] Empty-state s ikonou a akcí.
- [x] Mobilní sticky sloupec tabulek.
- [x] Responzivní grid pro fondy.
- [x] Skeletony na zbývajících stránkách (Nastavení, Audit) — reusable `Skeleton`/`SkeletonList` komponenta vytvořena; použita v zaměstnancích, požadavcích, účtech, správě rozpisů.
- [ ] Sjednocení toast/alert (architektonické rozhodnutí).
- [ ] Ověřit mobilní zobrazení (390 px) — kalendářní pruh, tabulky.
- [ ] Ověřit tmavý režim (pokud bude zaveden).

## Fáze 3 — Obsah pro prezentaci
- [ ] Stránka Pravidla — ověřit, že seznam potvrzených pravidel je úplný a správný.
- [x] Stránka Analyzy — zatím placeholder s odkazem na Audit; read-only přehled je Milník 2.
- [ ] Stránka Dovolené — zřetelně označit jako „připravované“.
- [ ] Audit — zobrazit alespoň jeden potvrzený záznam (vytvořit testovací rozpis).
- [ ] Správa účtů — vytvořit testovací viewer účet pro demo.

## Fáze 4 — Technická připravenost
- [x] Solver timeout 120 s konfigurovatelný (Milník 1) — implementováno (env `PLANNING_SOLVER_TIMEOUT_MS`, výchozí 120 s, strop 300 s).
- [ ] Výkonnostní test: 20+ zaměstnanců, 15/7 obsazení, do 120 s.
- [ ] Ověřit, že `npm run build` projde bez varování.
- [ ] Ověřit, že CI (GitHub Actions) projde.
- [ ] Zkontrolovat `.env.example` — všechny potřebné proměnné dokumentovány.

## Fáze 5 — Dokumentace pro vedení
- [x] Aktualizovat `README.md` — stav projektu, co je hotové, co je demo.
- [x] Připravit krátký scénář prezentace (kroky 1–5 výše) — `docs/PREZENTACNI_SCENAR.md`.
- [x] Připravit „co není hotové“ — částečné úvazky, produkční auth/DB, analytika.

## Blokující položky (vyžadují rozhodnutí)
- Žádné — všechna rozhodnutí jsou zapsána v `docs/DOMAIN_DECISIONS.md`.

## Poznámky
- Pilot podporuje pouze plné úvazky (částečné úvazky jsou Milník 7).
- Produkční autentizace a databáze zůstávají `NOT VERIFIED`.
- Reálná zaměstnanecká data se nepoužívají; demo používá anonymizované vstupy.