# ADR 0008: Online AI-only plánování a jednotné UI

- **Stav:** Accepted
- **Datum:** 6. 11. 2026
- **Rozhodnutí:** uživatel

## Kontext

Projekt je určen pro online prezentaci/MVP na Vercel Hobby. Lokální Python
OR-Tools solver není pro cílové použití potřebný a znamená druhou plánovací
implementaci, lokální závislosti a rozdílné chování UI. Cloudflare Workers AI
je zvolený měsíční poskytovatel; při vyčerpané kvótě je dovoleno nabídnout
výslovný simulovaný demo scénář, nikoli jej vydávat za AI výsledek.

Rozhraní se historicky vyvíjelo po stránkách a vznikly rozdíly v hlavičkách,
formulářích, prázdných stavech a površích. To snižuje srozumitelnost a důvěru
při prezentaci.

## Rozhodnutí

1. Odstranit lokální OR-Tools implementaci, její Python závislosti, provider,
   integrační testy a CI job. Nové měsíční běhy používají Cloudflare AI nebo
   výslovně zvolený simulovaný provider.
2. Zachovat čitelnost historických uložených návrhů s `mode: "ortools"`;
   nové návrhy se v tomto režimu nevytvářejí.
3. Z MVP UI odstranit OR-Tools-only doplánování souvislé části měsíce.
   Historická data a jejich zobrazení se nemažou.
4. Při vyčerpání AI kvóty nabídnout jasně označené jednorázové spuštění
   simulovaného scénáře. Nepoužívat nefunkční globální přepínač Demo/Production
   a nikdy nepřepínat tiše.
5. Sjednotit všechny stránky do jednoho tmavého design systému: typografii,
   mezery, hlavičky, formuláře, tlačítka, karty, prázdné/loading/error stavy
   a mobilní chování. Nezavádět další téma.

## Důsledky

- Aplikace není lokálně samostatně plánující; plánovací požadavek vyžaduje
  Cloudflare AI nebo explicitní simulated režim.
- Částečné plánování měsíce není součástí současného MVP.
- Historická roadmapa a specifikace zmiňující OR-Tools zůstávají zdrojovými
  záznamy dřívějších ověření, nikoli aktuálním produkčním směrem.
- Vývoj pokračuje po malých, ověřených UI skupinách a regresních testech.
