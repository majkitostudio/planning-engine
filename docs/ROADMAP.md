# Aktuální stav a další kroky

**Aktualizováno:** 9. 11. 2026 podle commitnutého `main` na `05021a2` z 7. 11. 2026. Místní pracovní strom obsahuje další necommitnuté změny; tyto statusy je nepovažují za součást hlavní větve. Úplná starší historie kontrol je zachována v [`archive/2026-11-07/ROADMAP.md`](archive/2026-11-07/ROADMAP.md).

## Stav v kostce

| Oblast | Stav | Co to přesně znamená |
| --- | --- | --- |
| Měsíční tok | `IMPLEMENTED` | Formulář, návrh, opakovaná kontrola, přehled běhů a manažerské potvrzení jsou v aplikaci. |
| Provider | `IMPLEMENTED` | Měsíční runtime používá Cloudflare Workers AI; simulace se spouští výslovně. Gemini adaptér zůstává starší variantou. |
| Deterministická validace | `IMPLEMENTED` | Kontroluje měsíční návrh nezávisle na výstupu AI. Chybějící historie může dát `not_verified`; není to úspěšná kontrola. |
| Potvrzení a audit | `IMPLEMENTED` | Návrh se sám nepotvrzuje; potvrzení dostupné pouze manažerovi ukládá událost a snapshot. |
| Lokální databáze | `VERIFIED` v dřívějších izolovaných bězích | Dřívější lokální syntetické testy pokryly migrace a ukládání. To nedokládá současnou dosažitelnost Neon ani produkční připravenost. |
| Reálné AI volání | `VERIFIED` pro jednotlivé testy | Cloudflare API bylo skutečně voláno nad syntetickými daty. Jednotlivý úspěšný běh nezaručuje opakovatelnost. |
| Kvalita plánů | `PARTIAL` / `NOT VERIFIED` pro běžné použití | Jsou doložené jak validní, tak nevalidní výsledky podle scénáře a podoby zadání. Reprezentativní spolehlivost není změřena. |
| Produkční připravenost | `NOT VERIFIED` | Online nasazení, produkční role a bezpečnost, zálohy, obnova a monitoring nejsou kompletně ověřeny. |

## Co doložily testy AI

Podrobné protokoly jsou v [`PLAN_OVERENI_AI.md`](PLAN_OVERENI_AI.md). Nejpodstatnější důkazy:

- Syntetický kvalitativní scénář se čtyřmi lidmi: dva běhy vytvořily 60/60 přiřazení a validaci `valid`; oba měly čtyři neblokující nálezy chybějícího fondu. Běhy trvaly 68,1 a 80,5 sekundy.
- Jiný běh nad kompaktním zadáním pokryl 60/60 pozic, ale validace byla `invalid` kvůli třem přiřazením v nedostupnosti a jednomu zásahu do absence. Běh trval 86,7 sekundy.
- Jiný integrační běh ověřil strukturovaný výstup a identifikátory, ale měl záměrně neúplné návaznosti; nedokázal platnost rozpisu.

Scénáře jsou malé a syntetické. Nelze z nich odvodit běžnou míru úspěšnosti, minimální počet zaměstnanců, provozní kapacitu ani stabilitu modelu.

## Nejbližší práce

1. **Udržet reprodukovatelnou kvalitativní sadu syntetických scénářů.** Zaznamenávat zadání verze provideru, výsledek validace, nálezy, pokrytí a dobu. Odlišit validní běh od pouhého úspěšného API volání.
2. **Prověřit slabá místa podle nezávislé validace.** Zvláštní pozornost věnovat dostupnosti, schválené absenci, hranicím měsíce, přetížení a vysvětlení neobsazených míst.
3. **Vyjasnit vstupy pilotu.** Rozhodnout, jak manažer zadává konkrétní volna a časovou dostupnost. Do té doby stávající vstupy nemažte ani jejich význam nerozšiřujte.
4. **Zachovat blokaci potvrzení při neúplných podkladech.** `not_verified` neprezentovat jako úspěch ani jako důkaz chyby plánu.
5. **Online nasazení posoudit odděleně.** Před případným nasazením znovu ověřit cílové prostředí a bezpečnostní podmínky. Tento dokument nasazení ani změnu databáze neschvaluje.

## Mimo současný pilot

Částečné úvazky, plánování jen části měsíce, přímé integrace a širší WFM funkce nejsou současným cílem. Nezařazovat je bez nového rozhodnutí o rozsahu.

## Historie rozhodovacího směru

OR-Tools byl implementován jako místní měsíční solver 3. 11. 2026 a odstraněn rozhodnutím 6. 11. 2026, když byl přijat online směr Cloudflare AI a jednotné UI. Historické testy solveru jsou archivní důkazy, ne současná implementace ani plánované automatické další práce. Podrobnosti jsou v [ADR 0008](adr/0008-cloudflare-only-and-unified-ui.md) a archivu starší roadmapy.
