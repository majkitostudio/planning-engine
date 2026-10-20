# Plánovací Engine

Technický repozitář: `planning-engine`

## Účel projektu

Plánovací Engine je záměr základu budoucího plánovacího nebo směnovacího enginu.
Přesná doménová pravidla, omezení, optimalizační cíle, datový model, uživatelské role
i technologický stack ještě **nejsou schváleny**.

## Stav projektu

Toto je **počáteční technický scaffold**. Nejedná se o hotovou ani produkční aplikaci.

- Plánovací pravidla a doménová logika zatím nejsou schválené ani implementované.
- Projekt neobsahuje skutečná osobní ani zaměstnanecká data.
- Projekt není připraven k produkčnímu provozu.

## Technologický stack

Zatím **neurčen**. Stack-specifické soubory budou přidány až po výslovném rozhodnutí.

## Dokumentace

Přehled najdeš v [`docs/README.md`](docs/README.md).
Instrukce pro agenty v [`AGENTS.md`](AGENTS.md).

## Bezpečnost a hranice

- Žádná produkční databáze, žádná autentizace/integrace, žádná reálná data.
- Přístup k externím službám (např. GitHub) vyžaduje samostatné potvrzení.

## Stav informací

| Označení | Význam |
| --- | --- |
| `VERIFIED` | Ověřeno v projektu nebo příkazem |
| `IMPLEMENTED` | Implementováno |
| `PLANNED` | Plánováno, neimplementováno |
| `ASSUMPTION` | Pracovní předpoklad |
| `OPEN QUESTION` | Otevřená otázka |
| `NOT VERIFIED` | Nebylo ověřeno |
| `SIMULATED` | Pouze demonstrační/testovací chování |
| `BLOCKED` | Nelze bezpečně pokračovat bez rozhodnutí |
