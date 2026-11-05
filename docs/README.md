# Dokumentace � Pl�novac� Engine

Technick� repozit��: `planning-engine`

Rozcestn�k dokumentace. Ka�d� dokument m� jednu hlavn� odpov�dnost a podrobnosti
jin�ch dokument� neopakuje.

Dokumentace obsahuje pouze aktu�ln� dom�nov�, technick� a stavov� podklady.
Schv�len� dom�nov� rozhodnut� plat� podle jejich aktu�ln�ho zn�n� v
`DOMAIN_DECISIONS.md` a `DOMAIN_SPECIFICATION.md`; aktu�ln� implementaci a
ov��en� uv�d� `ROADMAP.md`. Historick� implementa�n� pl�ny a do�asn�
podklady byly odstran�ny.

## Kde co hledat

| Dokument | Odpov�d� na | Stav |
| --- | --- | --- |
| [`../README.md`](../README.md) | Co projekt je, jak� je stav a jak ho spustit | `IMPLEMENTED` |
| [`../AGENTS.md`](../AGENTS.md) | Pravidla pr�ce coding agenta a meze autonomie | `IMPLEMENTED` |
| [`ROADMAP.md`](ROADMAP.md) | Co je hotov�, co chyb� a co d�lat d�l | `IMPLEMENTED` (pracovn� pl�n) |
| [`PLANNING_CONTRACT.md`](PLANNING_CONTRACT.md) | P�vodn� t�denn� AI kontrakt a odkazy na m�s��n� tok | `PROPOSAL` (kontrakt) / `IMPLEMENTED` (k�d) |
| [`DOMAIN_SPECIFICATION.md`](DOMAIN_SPECIFICATION.md) | Dom�nov� model a pravidla s m�rou potvrzen� | `PARTIALLY VERIFIED PROPOSAL` |
| [`DOMAIN_DECISIONS.md`](DOMAIN_DECISIONS.md) | Otev�en� ot�zky a odpov�di managera | `PARTIALLY ANSWERED` |
| [`adr/`](adr/README.md) | Pro� jsou technick� rozhodnut� takov� | `IMPLEMENTED` |
| [`../lib/planning/README.md`](../lib/planning/README.md) | Co skute�n� obsahuje pl�novac� j�dro | `IMPLEMENTED` |
| [`../prisma/schema.prisma`](../prisma/schema.prisma) | Identita, zam�stnanci, b�hy, staffing a rozhodnut� | `IMPLEMENTED` (lok�ln� migrace `VERIFIED`, produk�n� DB `NOT VERIFIED`) |

## Aktu�ln� stav

| Oblast | Stav | Pozn�mka |
| --- | --- | --- |
| Next.js aplikace a routy | `IMPLEMENTED` | App Router, TypeScript, React |
| Demo UI | `IMPLEMENTED` / `DEMO` | Syntetick� data z `lib/demo-data.ts` |
| Generick� pl�novac� j�dro | `IMPLEMENTED` | `lib/planning/types.ts`, `control.ts` |
| Dom�nov� kontrakt | `IMPLEMENTED` | `lib/planning/domain/`; kontrakt je `PROPOSAL` k ov��en� |
| Deterministick� validace | `IMPLEMENTED` | `validatePlan()`; testy proch�zej� |
| AI kontrakt | `IMPLEMENTED` | `lib/planning/ai-provider.ts` |
| Gemini adapt�r | `IMPLEMENTED` / `VERIFIED` | `lib/ai/gemini-planning-provider.ts`; integra�n� vol�n� pro�lo, produk�n� kvalita v�stupu `NOT VERIFIED` |
| Orchestrace | `IMPLEMENTED` | `runPlanning()` spojuje n�vrh, validaci a zm�ny |
| Star�� t�denn� API | `IMPLEMENTED` / `DEMO` | `POST /api/planning/run`; samostatn� t�denn� UI bylo odstran�no |
| M�s��n� pilot | `IMPLEMENTED` / `NOT VERIFIED` | M�s��n� formul��, lok�ln� OR-Tools, nez�visl� kontrola, n�vaznost a dopl�nov�n� �seku; t�den je pohled do m�s�ce. Ru�n� �pravy v mana�ersk� obrazovce nejsou. Ov��en� a omezen� popisuje [roadmapa](ROADMAP.md). Schv�len� z�m�r hlavn� role AI se li�� od implementace. |
| Zam�stnanci pro pl�nov�n� | `IMPLEMENTED` | Mana�er spravuje trval� seznam a m��e na��st aktivn� zam�stnance do m�s��n�ho n�vrhu. Odebr�n� zachov� historii a zam�stnance lze znovu za�adit se stejnou identitou. |
| P�ihl�en� a role | `IMPLEMENTED` / `VERIFIED` (lok�ln� syntetick� smoke) | Auth.js podporuje v�vojov� local re�im a datab�zov� ��ty v PostgreSQL; vytvo�en� ��tu, zm�na hesla a zneplatn�n� deaktivovan� session pro�ly lok�ln�m browser pr�chodem. Produk�n� �rove� a Entra ID z�st�vaj� `NOT VERIFIED`/`PLANNED` |
| Spr�va p�ihla�ovac�ch ��t� | `IMPLEMENTED` / `VERIFIED` (izolovan� lok�ln� PostgreSQL) | `/uzivatele`, manager-only API a jednor�zov� `db:bootstrap-manager`; migrace, bootstrap, create, role, reset, povinn� zm�na hesla, viewer denial i soub�n� ochrana posledn�ho managera byly ov��eny synteticky. Produkce `NOT VERIFIED` |
| Potvrzen� mana�era | `IMPLEMENTED` | `POST /api/planning/confirm`, manager-only, blokace ��ste�n�ch/neov��en�ch n�vrh� |
| Ukl�d�n� b�h� a potvrzen� | `IMPLEMENTED` / `VERIFIED` (lok�ln� Docker smoke) | Prisma snapshot a `ConfirmedPlan`; migrace a z�pis potvrzen� byly ov��eny v izolovan� lok�ln� PostgreSQL |
| Audit potvrzen� | `IMPLEMENTED` / `VERIFIED` (lok�ln� Docker smoke) | Z�pis `planning.confirmed` byl ov��en; �tec� pohled je `IMPLEMENTED` pro managera a ukazuje pouze tato potvrzen� |
| Operativn� n�hrada sm�ny | `IMPLEMENTED` / `SIMULATED` | Syntetick� �ez: v�padek cel� sm�ny � t�i varianty � deterministick� dopad � v�b�r � manager-only potvrzen�; Gemini a provozn� kvalita `NOT VERIFIED` |
| Nastaven� pot�ebn�ho obsazen� | `IMPLEMENTED` / `VERIFIED` (lok�ln� smoke) | `/nastaveni`, manager-only z�pis p�es API, Prisma persistence a pou�it� v operativn�ch n�hrad�ch; migrace a manu�ln� browser smoke prob�hly v lok�ln�m Docker PostgreSQL |
| Rozhodov�n� o po�adavc�ch | `IMPLEMENTED` / `SIMULATED` | `/pozadavky` ukazuje dopad dvou syntetick�ch po�adavk�, dostupn� kandid�ty a manager-only schv�len�/zam�tnut�; rozhodnut� se ukl�d� p�es Prisma a samo neuprav� rozpis |
| Testy | `IMPLEMENTED` | V�sledky a rozsah posledn�ho zaznamenan�ho ov��en� uv�d� [roadmapa](ROADMAP.md). |
| Kvalitn� br�na (CI) | `IMPLEMENTED` / `VERIFIED` (lok�ln� b�h) | Testy, typecheck, lint, build a `db:validate` pro�ly; �pln� provozn�/produk�n� br�na z toho nevypl�v� |
| Produk�n� p�ipravenost | `NOT VERIFIED` | Nen� produk�n� aplikace |

## Stavov� popisky

| Popisek | V�znam |
| --- | --- |
| `IMPLEMENTED` | K�d nebo typ existuje. Neznamen�, �e chov�n� je ov��en�. |
| `VERIFIED` | Konkr�tn� chov�n� je dolo�en� testem, p��kazem nebo potvrzen�m rozhodnut�m. |
| `ASSUMPTION` | Pracovn� p�edpoklad, kter� nikdo nepotvrdil. |
| `OPEN QUESTION` | �ek� na rozhodnut� nebo chyb�j�c� informaci. |
| `PLANNED` | Implementace zat�m neexistuje. |

Pomocn� popisky: `NOT VERIFIED` (neov��eno), `DEMO`/`SIMULATED` (jen
demonstra�n� chov�n�), `PARTIALLY ...` (��ste�n�), `SUPERSEDED` (nahrazeno),
`BLOCKED` (nelze pokra�ovat bez rozhodnut�).

`IMPLEMENTED` a `VERIFIED` se neslu�uj�: implementovan� funkce m��e b�t
neov��en� a naopak.

## Otev�en� ot�zky

Pln� seznam OQ1�OQ24 je v [`DOMAIN_SPECIFICATION.md`](DOMAIN_SPECIFICATION.md);
odpov�di a varianty sb�r� [`DOMAIN_DECISIONS.md`](DOMAIN_DECISIONS.md). OQ21,
OQ23 a OQ24 jsou pro prvn� �ez uzav�en�. Pro operativn� n�hrady jsou nejd�le�it�j��:

1. Kter� dal�� pravidla a limity plat� (OQ9�OQ11), zejm�na maximum hodin/sm�n?
2. Jak� p�esn� datum m� m�t n�hradn� volno po z�skoku b�hem schv�len� dovolen� (OQ22)?
3. Jak se maj� v�it a porovn�vat varianty n�hrady (OQ12�OQ14, OQ17)?
4. Jak podrobn� m� b�t audit operativn� zm�ny (OQ20)?
