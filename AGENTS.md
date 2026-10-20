# AGENTS.md — Plánovací Engine

Tento soubor obsahuje projektové instrukce pro agenty pracující na projektu
**Plánovací Engine** (technicky `planning-engine`).

## Samostatnost projektu

- Projekt je samostatný. Nepřenášej do něj strukturu, názvy, databázová pravidla,
  obchodní logiku, kód ani dokumentaci z jiných projektů.
- Pokud najdeš cizí nebo nesouvisející soubory, nepřepisuj je. Upozorni uživatele.

## Zákaz domýšlení doménové logiky

- Nevymýšlej plánovací pravidla, směnová pravidla ani optimalizační funkce.
- Nevytvářej skutečná zaměstnanecká nebo osobní data.
- Plán, návrh či simulaci nevydávej za hotovou funkcionalitu.
- Rozlišuj: požadavek / předpoklad / návrh / ověřený fakt.

## Povinnost ověřování

- Po každé smysluplné změně spusť dostupný lint, typecheck, test či build.
- Pokud příkaz v projektu neexistuje, uveď to.
- Pokud testy selžou, neoznačuj úkol za dokončený.
- Nikdy netvrď, že něco funguje, pokud to neověříš.

## Bezpečnostní hranice

- Nevypisuj tajné klíče, tokeny, hesla ani obsah `.env`.
- Nevkládej tajné údaje do repozitáře.
- Nepoužívej produkční databázi ani produkční služby bez explicitního potvrzení.
- Nepředstírej, že simulované zabezpečení či aplikace je skutečné / produkční.
- Při práci mimo pracovní adresář vysvětli důvod a vyžádej potvrzení.

## GitHub a externí operace

- Operace na GitHubu považuj za externí změny.
- Před vytvořením nebo změnou vzdáleného repozitáře ověř `git`, `gh`, `gh auth status`,
  aktivní účet, oprávnění a existenci cílového repozitáře.
- Zobraz přesný cíl, viditelnost a plánované operace a vyžádej potvrzení.
- Nepoužívej `git reset --hard`, `git checkout --`, force push ani hromadné mazání
  bez výslovného pokynu.
- Nikdy nevypisuj token (`gh auth token` apod.).

## Aktuální stav projektu

- **Plánovací Engine je počáteční technický scaffold.**
- Technologický stack: neurčen.
- Plánovací pravidla a doménová logika: neimplementovány.
- Stav informací označuj popisky (`VERIFIED`, `PLANNED`, `ASSUMPTION`,
  `OPEN QUESTION`, `NOT VERIFIED`, `SIMULATED`, `BLOCKED`).
