# Task pro OpenCode: Vizuální revize Plánovacího enginu

## Cíl
Zpřesnit současný vizuál do klidného, dospělého a profesionálního manažerského nástroje. Nejde o redesign doménové logiky ani o vytvoření nové aplikace.

## Vizuální směr
- Neutrální paleta: teplá bílá / velmi světlá šedá, grafitová, tlumené šedé.
- Primární akcent omez na jednu tlumenou neutrální barvu (např. grafit nebo tlumená šalvějová); žádné výrazné modré gradienty.
- Výrazné barvy používej jen pro sémantické stavy, kde mají význam: konflikt/chyba, upozornění, potvrzená dovolená/absence. Zachovej přístupnost a kontrast.
- Odstraň dojem „barevné demo šablony“: omez barevné avatary, dekorativní gradienty, nadbytečné stíny, kulaté/barevné plochy ikon a příliš mnoho různých akcentů.
- Zachovej jasnou hierarchii, dobrou čitelnost, přiměřené mezery a decentní tenké okraje.
- Tabulka směn zůstává hlavním pracovním prostorem. Dbej na čitelnost sloupců, zaměstnanců, víkendů a stavů.
- Pravý postranní panel nesmí vizuálně soupeřit s tabulkou. Zachovej jen současné funkce; nic nemaž ani nepřesouvej, pokud by to znamenalo změnu workflow bez zdůvodnění.

## Rozsah
- Nejprve projdi `AGENTS.md`, relevantní Next.js dokumentaci v `node_modules/next/dist/docs/` a existující vizuální komponenty.
- Proveď revizi hlavně v `app/globals.css`, `components/app-shell.tsx`, `components/plan/plan-workspace.tsx`, `components/plan/roster-table.tsx` a komponentách UI.
- Implementuj pouze bezpečné, čistě vizuální úpravy konzistentní s výše uvedeným směrem.
- Neměň doménová pravidla, výpočty, demo data, datový model, routy, databázi, autentizaci ani chování ovládacích prvků.
- Nepřidávej nové závislosti.
- Nevytvářej ani nepoužívej skutečná osobní či zaměstnanecká data.
- Zachovej explicitní označení demonstračních dat a skutečnosti, že plánovací logika zatím není implementována.
- Pokud narazíš na problém, který vyžaduje produktové rozhodnutí nebo se ti zdá navržená změna nevhodná, zastav se u tohoto bodu a popiš důvod pro společnou diskusi s uživatelem a ChatGPT. Nevymýšlej si doménová pravidla.

## Ověření
Po změnách spusť `npm run typecheck`, `npm run test` a `npm run build`, pokud je prostředí dovolí. Oprav pouze problémy způsobené vlastní změnou; nesouvisející problémy nahlas.
Před dokončením zkontroluj `git diff --check` a `git status --short`. Nic necommituj, neposílej na GitHub a nenasazuj.

## Výstup
Na konci stručně uveď:
1. které soubory se změnily a proč;
2. jaké vizuální změny byly provedeny;
3. výsledky ověření;
4. co zůstává otevřené nebo vyžaduje rozhodnutí.
