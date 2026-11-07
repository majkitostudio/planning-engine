# Nasazení — Vercel Hobby + stávající Neon

> **Stav:** pracovní postup; historické záznamy uvádějí provedené nasazení a
> migrace, aktuální stav prostředí ani celý tento postup nyní nebyly ověřeny.
> Nové nasazení ani migrace neprováděj bez výslovného potvrzení a bez zálohy.

## Předpoklady

- Projekt je **nekomerční** a používá **Vercel Hobby**.
- Databáze je **jediná stávající Neon Free**. Nezakládej další projekt ani
  vývojovou větev.
- Máš účet Cloudflare s API tokenem pro Workers AI a znáš Account ID.
- Máš přístup k Vercelu a k repozitáři.
- Tajné údaje vkládej pouze do prostředí Vercelu, nikdy do repozitáře.

## 1. Záloha a migrace

1. V Neonu pořiď snapshot nebo ověř dostupný bod obnovy.
2. Lokálně nastav `DATABASE_URL_UNPOOLED` na přímé připojení k Neonu.
3. Spusť `npm run db:migrate:deploy`.
4. Ověř `npx prisma migrate status`, že schéma je aktuální.

Migrace se nespouští při každém buildu; nechceš opakované zápisy do jediné
databáze.

## 2. Účty

- Manažerský účet vytvoř jednorázově přes `npm run db:bootstrap-manager`.
- Viewer účet vytvoř v aplikaci na stránce Správa účtů.
- Hesla nevkládej do chatu ani do dokumentace.

## 3. Vercel

1. Importuj repozitář jako Next.js projekt.
2. Node.js nech na `26.x` podle `.nvmrc`.
3. Nastav proměnné prostředí:

| Proměnná | Význam |
| --- | --- |
| `DATABASE_URL` | pooled připojení k Neonu pro aplikaci |
| `DATABASE_URL_UNPOOLED` | přímé připojení pro migrace |
| `AUTH_SECRET` | náhodný tajný klíč pro Auth.js |
| `PLANNING_AUTH_MODE` | `database` |
| `PLANNING_PERSISTENCE` | `prisma` |
| `PLANNING_MONTHLY_PROVIDER` | `cloudflare` |
| `CLOUDFLARE_ACCOUNT_ID` | ID účtu Cloudflare |
| `CLOUDFLARE_API_TOKEN` | token s právem Workers AI |
| `CLOUDFLARE_AI_MODEL` | volitelné, výchozí `@cf/meta/llama-3.3-70b-instruct-fp8-fast` |
| `CLOUDFLARE_AI_TOTAL_TIMEOUT_MS` | volitelné, rozpočet na celý měsíc, výchozí `270000` |

4. Nasaď nejprve **preview**, ne production.
5. Ověř přihlášení, načtení stránek, jeden dotaz do databáze a vytvoření
   návrhu na smyšlených datech.
6. Teprve po úspěšném preview nasaď produkční adresu.

## 4. Ověření AI plánovače

Reálné volání se ověřuje odděleně, aby se kvóta nespotřebovávala při běžných
testech:

```bash
RUN_CLOUDFLARE_INTEGRATION=1 npx vitest run lib/ai/cloudflare-planning-provider.integration.test.ts
```

Test používá smyšlený listopad 2026 a osm syntetických zaměstnanců. Ověří, že
Cloudflare vrátí strukturovaný návrh, přiřazení patří do měsíce a nezávislá
validace návrh nezfalšuje. Samotný úspěch testu neznamená, že je kvalita
plánování dostatečná pro provoz; tu je potřeba posoudit na více měsících.
Test vypíše počet přiřazení, stav validace, počet nálezů a dobu běhu.

### Technické limity, se kterými adaptér počítá (`VERIFIED` dokumentací, 6. 11. 2026)

- Model `@cf/meta/llama-3.3-70b-instruct-fp8-fast` má **kontextové okno
  24 000 tokenů** a podporuje JSON schema režim. Proto adaptér odmítne prompt
  nad 40 000 znaků ještě před voláním; hrubý přepočet je ~3 znaky na token
  a rezerva na výstup.
- Měsíc se posílá **po kalendářních týdnech**, tedy až šest požadavků za sebou.
  Vercel Hobby (2026) dovoluje funkci běžet až 300 s; adaptér má proto vlastní
  rozpočet na celý měsíc (výchozí 270 s) a po jeho vyčerpání vrátí jasnou chybu
  bez uložení návrhu.
- Když Cloudflare odmítne splnit JSON schéma (chyba „JSON Mode couldn't be met“),
  aplikace to ohlásí jako neplatný výstup a návrh neuloží. Náhradní model se
  nezapíná automaticky.
- Volání jsou sekvenční, protože každý týden dostává předchozí hotové směny jako
  návaznost. Paralelní volání by tuto návaznost ztratila.

## 5. Co ověřit po nasazení

- Manager i viewer se přihlásí a vidí správné role.
- Návrh se uloží, zobrazí nálezy a po obnovení stránky zůstane.
- Potvrzení je blokované u neověřeného nebo neúplného návrhu.
- V prohlížeči nejsou žádné tajné klíče.
- Denní kvóta Cloudflare stačí na jeden měsíční návrh; při vyčerpání aplikace
  odmítne běh a nevytvoří falešný návrh.

## Co tento postup neřeší

- Produkční zálohy, monitoring, obnovu po havárii ani SLA.
- Komerční použití; to by vyžadovalo Vercel Pro a nové posouzení.
- Více databází, více týmů ani více manažerů.
