# ADR 0007 — Nekomerční hosting: Vercel Hobby, jediná Neon databáze

- **Stav:** `PLANNED`; nic není nasazené ani ověřené v online prostředí
- **Datum:** 6. 11. 2026
- **Kontext:** `README.md`, `docs/DOMAIN_DECISIONS.md`, `docs/ROADMAP.md`,
  `prisma.config.ts`, `lib/db.ts`

## Kontext

Projekt je nekomerční ukázka pro jednoho manažera a rozpočet je 0 Kč.
Uživatel má jednu stávající Neon databázi na bezplatném tarifu a nechce
zakládat žádné další databáze. Aplikace je Next.js; Vercel Hobby je zdarma
a pro tento framework nejpřímější. Vercel omezuje Hobby na osobní, nekomerční
použití; uživatel potvrdil, že projekt je nekomerční.

## Rozhodnutí

- **Hosting je Vercel Hobby** bez placeného tarifu a bez automatického přechodu
  na Pro.
- **Databáze je jediná stávající Neon Free.** Nové projekty, izolované ani
  vývojové databáze se nezakládají.
- **Migrace se spouštějí ručně** přes `prisma migrate deploy` s přímým
  připojením (`DATABASE_URL_UNPOOLED`), nikoli při každém buildu.
- **Tajné údaje patří do prostředí Vercelu**, ne do repozitáře. Náhledové
  nasazení se ověří dřív než ostrá adresa.
- **Před migrací se pořídí záložní bod / snapshot**, protože jde o jediná data.
- **Lokální OR-Tools se na Vercelu nepoužívá**; online režim je AI-only.

## Důsledky

- Bezplatné limity znamenají při vyčerpání nedostupnost, ne automatickou
  fakturu; přesto se spotřeba musí sledovat.
- Neon Free má po nečinnosti zpoždění při probuzení a omezenou historii obnovy.
- Přihlášení, migrace, plánování a potvrzení se musí ověřit na náhledovém
  nasazení; samotný úspěšný build to neprokazuje.
- Případná změna na komerční projekt by vyžadovala Vercel Pro a nové posouzení.

## Co to neznamená

- Že je aplikace produkční, zálohovaná nebo monitorovaná.
- Že smí používat produkční databázi bez výslovného potvrzení.
- Že jsou bezplatné limity vhodné pro více uživatelů nebo trvalý provoz.
