# Nasazení — Vercel Hobby + stávající Neon

> **Stav:** `PLANNED`. Tento postup není provedený ani ověřený. Nenasazuj ho
> bez výslovného potvrzení a bez zálohy databáze.

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

4. Nasaď nejprve **preview**, ne production.
5. Ověř přihlášení, načtení stránek, jeden dotaz do databáze a vytvoření
   návrhu na smyšlených datech.
6. Teprve po úspěšném preview nasaď produkční adresu.

## 4. Co ověřit po nasazení

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
