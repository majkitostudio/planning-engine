# Task pro OpenCode: Pravidlově nezávislá kostra plánovacího jádra

## Cíl

Připravit v `lib/planning/` malý, čistě testovatelný základ, do kterého půjde
později doplnit skutečný způsob generování rozpisu a schválená pravidla.
Manager zůstává tím, kdo návrh posoudí a rozhodne o jeho přijetí. Mechanický
plánovač nebo budoucí AI mohou dodat návrh, ale samy ho neschvalují.

## Zásada návrhu

Tok má společný tvar:

```text
zdroj návrhu → návrh plánu → kontrola dostupnými pravidly → výsledek kontroly → rozhodnutí managera
```

Zdrojem návrhu může být ruční práce, pozdější deterministická mechanika nebo
pozdější AI. V tomto tasku stačí připravit rozšiřitelný kontrakt pro zdroj;
žádný skutečný generátor ani AI se neimplementuje.

## Rozsah

- Projdi `AGENTS.md`, `docs/DOMAIN_SPECIFICATION.md` a
  `lib/planning/README.md`.
- Navrhni a implementuj malé TypeScript kontrakty pro návrh plánu, zdroj návrhu,
  pravidlo a výsledek kontroly.
- Umožni spustit sadu pravidel nad návrhem a vrátit nalezené problémy se
  stabilním identifikátorem pravidla a závažností.
- Výsledek musí rozlišit alespoň: kontrola proběhla a nenašla problém,
  kontrola našla problém, kontrola nemohla potvrdit plán, protože nejsou
  nakonfigurovaná pravidla.
- Když není nakonfigurované žádné pravidlo, výsledek musí být
  `NOT VERIFIED`/neověřeno. Nesmí se interpretovat jako úspěšný, bezpečný,
  schválený ani hotový plán.
- Návrh musí nést informaci, odkud pochází. Toto pole je pouze původ návrhu,
  nikoli oprávnění k jeho automatickému přijetí.
- Přidat jednotkové testy pro výše uvedené stavy, prázdnou sadu pravidel,
  nalezený problém a bezproblémový průchod jednoduchým testovacím pravidlem.

## Mimo rozsah

- Nevymýšlej směnové entity, atributy, zákonné limity ani provozní pravidla.
- Neimplementuj optimalizaci ani generování skutečného rozpisu.
- Nepřipojuj databázi, Prisma, Next.js ani UI.
- Neimplementuj AI ani volání externích služeb.
- Neměň aktuální demo data ani vizuální úpravy.
- Nepřidávej závislosti.

Pokud návrh kontraktu vyžaduje volbu doménového významu, který specifikace
nepotvrzuje, zastav se u dané volby a popiš ji. Vyber jen technické názvy a
typy, které lze později změnit bez předpokladu o směnových pravidlech.

## Akceptační kritéria

- Plánovací jádro je nezávislé na UI, Next.js a databázi.
- Zdroj návrhu je možné později rozšířit bez změny validačního toku.
- Pravidla jsou předávána jako vstup; samotný tok nepředpokládá konkrétní
  směnové pravidlo.
- Žádná pravidla znamenají `NOT VERIFIED`, nikdy automatické schválení.
- Výsledek kontroly lze testovat bez PostgreSQL a bez reálných dat.
- Nezměněné části pracovního stromu zůstanou nedotčené.

## Ověření a výstup

- Kód umísti do `lib/planning/`. Rozdělení do souborů si zvol sám, ale vrstva
  zůstane nezávislá (žádné importy UI, databáze ani Next.js).
- Po dokončení aktualizuj stav v `lib/planning/README.md`, aby odpovídal tomu,
  co v adresáři skutečně je.
- Spusť `npm run typecheck` a `npm run test`.
- Spusť `npm run build`, pokud nové importy zasahují do aplikace; jinak stačí
  typová kontrola a testy.
- Zkontroluj `git diff --check` a `git status --short`.
- Nic necommituj, neposílej na GitHub a nenasazuj.
- Na konci vypiš změněné soubory, rozhodnutí o kontraktech a výsledky ověření.
