# ADR 0005 — AI navrhuje, validace ověřuje, manažer potvrzuje

- **Stav:** `IMPLEMENTED` (rozhodnutí), navazující kód `PLANNED`
- **Datum:** 24. 10. 2026
- **Kontext kódu:** `lib/planning/types.ts`, `lib/planning/domain/types.ts`,
  `docs/PLANNING_CONTRACT.md`

## Kontext

Původní kostra jádra (ADR 0001–0004) připouštěla, že návrh může vzniknout
ručně, mechanicky nebo později AI. Nové zadání z 24. 10. 2026 mění roli AI:
**AI je hlavní plánovací logika**, ne volitelný doplněk. Zároveň platí, že
samotná deterministická pravidla nestačí jako plánovací algoritmus a že
manažer musí návrh potvrdit.

Nabízely se dvě cesty:

1. Nechat AI jen jako vysvětlující vrstvu nad deterministickým algoritmem.
2. Nechat AI vytvořit konkrétní návrh a deterministickými pravidly ho nezávisle
   zkontrolovat.

## Rozhodnutí

- **AI vytváří konkrétní návrh** (`PlanDraft`) včetně vysvětlení, alternativ
  a označených předpokladů.
- **Deterministická validace je nezávislá kontrola** návrhu. Pravidla jsou
  vstupem validace, ne součástí AI promptu jako jediná pojistka.
- **Manažer potvrzuje.** Výsledek běhu má `confirmed: false`; potvrzení je
  samostatný krok mimo AI i validační jádro.
- **Neúplný návrh se přizná** a doplní alternativami; nesmí se vydávat za plně
  ověřený.

## Důsledky

- AI musí vracet strukturovaný výstup odpovídající kontraktu; neplatný výstup
  se odmítne, nedoplňuje se potichu.
- Validace musí být testovatelná bez AI a bez databáze.
- UI musí zřetelně rozlišit návrh, ověřený návrh a potvrzené změny.
- Chybějící AI je selhání běhu (`ai_not_configured`), ne prázdný nebo náhodný
  plán.
- Změny a pokrytí se počítají deterministicky z přiřazení, aby se snížil počet
  neověřených tvrzení v AI výstupu.

## Co to neznamená

- Neznamená, že AI smí obcházet pravidla nebo potvrzovat plán.
- Neznamená, že deterministická pravidla jsou méně důležitá; naopak jsou
  pojistkou, která musí fungovat i při chybě AI.
- Neznamená, že každý návrh AI je použitelný. Bez validace a potvrzení je to
  jen draft.
- Neznamená, že se má nyní integrovat Countdown CRM nebo vytvářet univerzální
  framework.
