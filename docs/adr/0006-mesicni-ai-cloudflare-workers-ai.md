# ADR 0006 — Měsíční AI plánovač na Cloudflare Workers AI

- **Stav:** adaptér `IMPLEMENTED`; reálné volání a kvalita výstupu `NOT VERIFIED`
- **Datum:** 6. 11. 2026
- **Kontext kódu:** `lib/ai/cloudflare-planning-provider.ts`,
  `lib/planning/monthly-planning.ts`, `app/api/planning/monthly/run/route.ts`

## Kontext

Měsíční pilot má podle schváleného záměru sestavovat AI, ale rozpočet projektu
je 0 Kč. Bezplatná úroveň Gemini není podle jejích podmínek použitelná pro
aplikaci dostupnou uživatelům v EHP a placená varianta rozpočet nesplňuje.
Cloudflare Workers AI nabízí bezplatných 10 000 neuronů denně, model
`@cf/meta/llama-3.3-70b-instruct-fp8-fast` podporuje JSON Mode a dokumentace
uvádí nulové uchovávání vstupů i výstupů a žádné trénování na zákaznickém
obsahu.

Jeden požadavek na celý měsíc by byl pro výstupní limit a bezplatnou kvótu
rizikový. Proto se měsíc generuje po kalendářních týdnech a spojený výsledek
projde stejnou deterministickou validací jako dříve.

## Rozhodnutí

- **Měsíční AI provider je Cloudflare Workers AI** přes REST API s JSON
  schématem; jádro zůstává na provideru nezávislé.
- **Měsíc se dělí na týdny**, každý týden dostane vlastní požadavek a předchozí
  hotové směny jako návaznost. Spojení se ověří jako celek.
- **Skutečná jména, směny, absence a volný text se posílají** podle `VERIFIED`
  rozhodnutí z 6. 11. 2026. Nejde o anonymizovaný režim.
- **Bezplatná kvóta je limit, ne nárok.** Při vyčerpání se běh odmítne; nedojde
  k tichému přepnutí na placenou službu ani k vymyšlenému návrhu.
- **Lokální OR-Tools zůstává offline.** Na Vercelu nelze spustit Python proces,
  který dnes solver vyžaduje.

## Důsledky

- Online měsíční plánování závisí na dostupnosti Cloudflare a denní kvótě.
- Kvalita návrhu a spotřeba neuronů se musí změřit na syntetickém měsíci;
  do té doby zůstává `NOT VERIFIED`.
- Chybějící `CLOUDFLARE_ACCOUNT_ID` nebo `CLOUDFLARE_API_TOKEN` je poctivě
  nekonfigurovaný stav, ne důvod k náhradnímu scénáři.
- Doplňování části měsíce zůstává dostupné jen v lokálním OR-Tools režimu.

## Co to neznamená

- Že je AI plánování ověřené nebo produkčně připravené.
- Že jsou bezplatné limity vhodné pro více manažerů nebo nepřetržitý provoz.
- Že se smí obcházet deterministická validace nebo potvrzení manažerem.
