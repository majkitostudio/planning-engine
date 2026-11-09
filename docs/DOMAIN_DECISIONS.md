# Aktuální doménová rozhodnutí

Tento soubor obsahuje pouze rozhodnutí platná pro současný pilot a otázky, které mohou změnit jeho rozsah. Podrobné původní zápisy a starší odpovědi jsou zachované v [`archive/2026-11-07/DOMAIN_DECISIONS.md`](archive/2026-11-07/DOMAIN_DECISIONS.md). Závazná pracovní pravidla jsou v kořenovém [`AGENTS.md`](../AGENTS.md); podrobná současná specifikace je v [`DOMAIN_SPECIFICATION.md`](DOMAIN_SPECIFICATION.md).

## Potvrzený záměr

| Rozhodnutí | Aktuální podoba |
| --- | --- |
| Cíl | Pomoci jednomu manažerovi call centra sestavit použitelný rozpis na celý kalendářní měsíc. Hlavním výsledkem je samostatně vytvořený návrh, ne ruční hledání kombinací manažerem. |
| Pilot | Jeden celý kalendářní měsíc, zaměstnanci na plný úvazek. Týdenní tabulka je pohled do měsíce. Částečné úvazky a další systémové integrace jsou mimo pilot. |
| Plánovací provider | Cloudflare Workers AI je aktuálně zvolený měsíční provider. Lokální OR-Tools byl odstraněn rozhodnutím z 6. 11. 2026. Změna této cesty vyžaduje nové výslovné rozhodnutí a aktualizaci ADR 0008 i `AGENTS.md`. |
| Role AI | AI vytváří návrh a pracuje se zadanými požadavky. Její výsledek nenahrazuje nezávislou deterministickou validaci ani potvrzení manažera. Volný text není sám o sobě ověřeným tvrdým pravidlem. |
| Potvrzení | Vygenerování návrhu ho neaplikuje. Manažer návrh zkontroluje a potvrzuje; neúplný nebo neověřený návrh potvrdit nelze. |
| Neúspěšné plánování | Nenalezený návrh sám nedokazuje nemožnost. Aplikace má popsat známé nedostatky a nejistotu; přesný počet dalších zaměstnanců smí tvrdit jen s ověřeným podkladem. |
| Hosting a rozpočet | Nekomerční ukázkový projekt s rozpočtem 0 Kč; cílem je Vercel Hobby a stávající Neon Free. Online nasazení a produkční připravenost nejsou tímto rozhodnutím ověřeny. |
| Data externí AI | Rozhodnutí z 6. 11. povoluje Cloudflare Workers AI skutečná jména, rozpisy, absence a volný text. Používat pouze zvolený režim zpracování bez uchovávání a trénování na zákaznickém obsahu; provozní kvalitu plánů to nepotvrzuje. |

## Potvrzená pravidla plánování

- Ranní směna: 07:45–16:30 ve všední dny i o víkendu.
- Odpolední směna: 13:15–21:00 ve všední den; 12:45–21:00 o víkendu.
- Pracovní den pro pravidlo šesti dnů znamená kalendářní den, kdy má člověk alespoň jednu směnu.
- Po šesti po sobě jdoucích pracovních dnech musí následovat nejméně 35 hodin souvislého odpočinku.
- Zaměstnanec, který pracuje o víkendu, má během téhož týdne dva dny volna. Týden je pondělí–neděle; dny volna nemusejí být po sobě.
- Potřebné obsazení zadává manažer; historické počty nejsou pevné pravidlo.
- Částečný návrh může být zobrazen k posouzení, ale nesmí být potvrzen.

Podrobnosti včetně výjimek a validačních stavů jsou v [`DOMAIN_SPECIFICATION.md`](DOMAIN_SPECIFICATION.md). Nejde o úplnou pracovněprávní specifikaci.

## Otevřené otázky pro pilot

1. **Vstupy volna a omezení:** jaké konkrétní absence a časově omezenou dostupnost má manažer v pilotu zadávat a s jakým významem? Stávající vstupy se nemažou, dokud toto rozhodnutí není vyjasněno.
2. **Pravidla změn potvrzeného měsíce:** jaký má být budoucí postup při opravě již potvrzeného rozpisu? Současná implementace má historii a audit, ale toto neuzavírá všechny budoucí pracovní postupy.
3. **Pracovní doba a přestávky:** současná kontrola používá hrubý interval směny. Přestávky, právní interpretace hodin a další právní podmínky nejsou úplným pravidlem tohoto pilotu.
4. **Uchovávání AI zadání:** je třeba potvrdit provozní dobu uchovávání a mazání volného textu uloženého v běhu.
5. **Opakovatelná kvalita AI:** zatím nejsou doloženy výsledky reprezentativní sady scénářů ani míra opakovatelnosti. Jde o ověření produktu, ne o nové doménové pravidlo.

Starší otázky pro širší nebo týdenní produkt zůstávají v archivu. Nejsou automaticky blokující pro současný měsíční pilot.
