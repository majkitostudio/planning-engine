# Inventura dokumentace

**Stav k 7. 11. 2026:** roztřídění podle účelu; samotné zařazení nepotvrzuje každé historické tvrzení v souboru. Při rozporu má přednost novější výslovné rozhodnutí a ověřený současný kód před starým záznamem.

## Aktivní orientace a plán

| Soubor | Úloha |
| --- | --- |
| `../README.md` | Úvod a spuštění; některé starší formulace ověření je nutné dále sjednotit s roadmapou. |
| `../AGENTS.md` | Závazné pracovní instrukce a projektové hranice. |
| `README.md` | Rozcestník a význam stavových popisků. |
| `ROADMAPA_DALSIHO_POSTUPU.md` | Navržené priority a kritéria další práce. |
| `PLAN_OVERENI_AI.md` | Praktické scénáře AI testů a bezpečnostní hranice. |
| `DEPLOYMENT.md` | Provozní postup; konkrétní stav služeb je nutné ověřit před akcí. |

## Rozhodnutí a technické podklady — zachovat

| Soubor | Úloha a omezení |
| --- | --- |
| `DOMAIN_DECISIONS.md` | Potvrzená rozhodnutí; obsahuje i historické části, které se nesmí zaměnit za aktuální pravidla. |
| `DOMAIN_SPECIFICATION.md` | Doménová specifikace; starší operativní otázky nemusí blokovat měsíční pilot. |
| `PLANNING_CONTRACT.md` | Kontrakt staršího týdenního API, které zůstává v kódu; není specifikací měsíčního UI. |
| `../lib/planning/README.md` | Technický popis plánovací vrstvy; při rozporu ověřit zdrojový kód. |
| `adr/` | Záznamy architektonických rozhodnutí, včetně kontextu a případného nahrazení. |
| `design/mvp-final.png` | Schválený vizuální podklad; není důkazem aktuální implementace. |

## Manažerský přehled

`projektova-karta.pdf` je dokument pro sdílení; `projektova-karta.html` je jeho upravitelný tiskový zdroj a `PROJEKTOVA_KARTA.md` obsahový podklad. Jde o časové snímky k 7. 11. 2026, nikoli automaticky aktualizovaný stav.

## Historické pracovní záznamy — opatrně

`ROADMAP.md`, `PRE_PUBLISH_CHECKLIST.md` a `MVP_DEPLOYMENT_CHECKLIST.md` obsahují užitečné důkazy a souvislosti, ale také překonané úkoly a údaje o dávném stavu. Nejsou samostatným zdrojem aktuálních priorit. Před jejich dalším zkrácením je třeba zachovat jedinečná rozhodnutí, bezpečnostní omezení a ověřit odkazy; tato hloubková konsolidace zatím není dokončena.

Odstraněny byly zastaralé přípravy a scénář proběhlé prezentace (`LEADERSHIP_DEMO_TODO.md`, `PREZENTACNI_SCENAR.md`). Nesledované obrázky v kořeni repozitáře jsou ponechány beze změny.
