# Operativní náhrady směn — návrh řešení

## Záměr

Připravit Planning Engine na operativní situaci, kdy zaměstnanec během již
naplánovaného týdne nebo dne nedorazí na konkrétní směnu. Manažer má vidět
dopad výpadku, dostat tři konkrétní návrhy náhrady, jednu variantu vybrat,
nechat ji nezávisle ověřit a teprve potom ji potvrdit.

Tento dokument je návrh další fáze. Neříká, že operativní náhrady už existují,
a neuzavírá doménové otázky, ke kterým chybí rozhodnutí managera.

## Schválené implementační volby (`VERIFIED`, 29. 10. 2026)

Manager schválil následující rozsah přípravy:

- výchozím stavem je poslední potvrzený plán; potvrzená náhrada vytvoří novou
  verzi celého týdne,
- první řez řeší jednu celou směnu; dílčí nástup uprostřed směny je mimo rozsah,
- AI může změnit i další celá přiřazení v týdnu, ale dopad musí být viditelný,
- výpadek je samostatný incident v pracovním návrhu a před potvrzením se
  neukládá,
- AI nabídne tři odlišné varianty, pokud jsou dostupné; nedostatek se přizná,
- dopad všech variant se dopočítá deterministicky a vybraná varianta se před
  potvrzením znovu validuje,
- první řez používá simulovaný provider a syntetická data,
- první audit obsahuje potvrzenou změnu, původní a nový rozpis, incident,
  vybranou variantu, výchozí verzi a identitu managera,
- maximální hodiny/směny se nebudou domýšlet a bez OQ10 zůstávají `NOT VERIFIED`.

## Cíl prvního funkčního řezu

První implementační řez bude syntetický a omezený na jeden týden:

1. manažer vybere konkrétní den, směnu a původní přiřazení,
2. označí zaměstnance jako nedorazivšího,
3. AI připraví tři konkrétní varianty náhrady,
4. každá varianta ukáže kandidáta, změny, pokrytí a kompromisy,
5. manažer vybere jednu variantu,
6. vybraná varianta projde deterministickou validací,
7. pouze kompletní a ověřená varianta může být potvrzena,
8. před potvrzením se původní rozpis nemění.

Pokud nelze dodat tři použitelné varianty, systém to výslovně přizná. Nesmí
vytvářet fiktivní zaměstnance ani tvrdit, že neověřená varianta je bezpečná.

## Co už existuje

Současný základ už poskytuje:

- týdenní `PlanningInput` s zaměstnanci, absencemi, požadovaným obsazením a
  existujícími přiřazeními,
- AI návrh `PlanDraft`,
- výpočet změn a pokrytí,
- deterministickou validaci překryvů, schválených absencí, pokrytí, odpočinku a
  víkendových dnů volna,
- blokaci potvrzení pro `not_verified`, `needs_changes` a `partial`,
- samostatné potvrzení managerem.

`Alternative` dnes existuje pouze jako obecný výstup AI. UI jej zobrazuje, ale
neumí variantu vybrat, znovu validovat ani potvrdit jako operativní změnu.

## Navrhovaný směr

Operativní náhradu vést jako samostatný návrh změny nad existujícím plánem,
nikoli jako nový univerzální plánovací framework. Stávající plánovací jádro se
znovu použije pro kontrolu výsledného celého týdne.

Navrhované pojmy jsou zatím `PROPOSAL`:

- `ShiftIncident` — výpadek konkrétního zaměstnance na konkrétní směně;
  nejde automaticky o celodenní schválenou absenci,
- `ReplacementRequest` — požadavek na nalezení náhrady nad konkrétní verzí
  výchozího rozpisu,
- `ReplacementOption` — jedna z nejvýše tří konkrétních variant,
- `baseProposalId` nebo `baseRevision` — ochrana proti práci nad zastaralým
  rozpisem.

Výsledky `changes`, `coverage` a `validation` se mají dopočítávat
deterministicky. AI navrhne varianty, ale nesmí být jediným zdrojem tvrzení o
jejich dopadu.

## Rozhodovací brány

Před rozšířením doménových typů musí manager rozhodnout alespoň:

- **OQ2:** zda se potvrzený plán průběžně upravuje a jak se řeší jeho verze,
- **OQ3–OQ4:** které entity a povinné atributy jsou pro výpadek nutné,
- **OQ6–OQ7:** jak se výpadek zadává a jak vypadá výsledek v UI,
- **OQ9–OQ11:** která pravidla jsou tvrdá, zejména dostupnost, role a limity,
- **OQ10:** konkrétní hodnoty maximálních hodin/směn a dalších limitů,
- **OQ12–OQ14 a OQ17:** co znamená „nejméně destruktivní“ varianta,
- **OQ20:** rozsah auditu operativní změny,
- **OQ22:** rozdíl mezi nahlášeným výpadkem, schválenou absencí a přáním.

Do rozhodnutí se nesmí doplňovat žádné pracovní nebo personální limity.
Potvrzené zůstávají pouze současná pravidla a výklady OQ21, OQ23 a OQ24.

## Přístupy

### A — dokumentační checkpoint, potom vertikální řez (zvoleno)

Nejprve sjednotit autoritativní dokumentaci, zapsat rozhodovací brány a vytvořit
detailní implementační plán. Potom implementovat jeden syntetický tok od
výpadku po potvrzení.

Výhoda: žádné neověřené pravidlo se omylem nezamkne v kódu a každý krok má
jasné přijetí. Tato varianta odpovídá schválenému postupu.

### B — rychlý prototyp přímo v současném demu

Přidat jeden scénář výpadku a tři varianty bez rozšíření plného doménového
kontraktu.

Výhoda: rychlé ověření obrazovky. Nevýhoda: hrozí, že do demonstračního kódu
proniknou neuzavřené významy absence, limitů nebo auditu.

### C — úplné doménové rozšíření před UI

Nejprve vyřešit všechny entity, limity, preference, historii a audit a až potom
stavět obrazovku.

Výhoda: úplnější model. Nevýhoda: je nepřiměřený současnému syntetickému
rozsahu a zbytečně by odsunul ověření skutečného pracovního toku.

## Co není cílem

- produkční připojení k databázi,
- Entra autentizace,
- Outlook, CRM nebo přenos do rosteru,
- skutečná zaměstnanecká data,
- měsíční plánování,
- částečné úvazky,
- domýšlení maximálních hodin, směn nebo dovedností,
- automatické použití změny bez potvrzení managera.

## Navazující dokumentace

Po schválení tohoto návrhu se aktualizují existující autoritativní dokumenty:

- `docs/README.md` — nový aktuální target a stav operativních náhrad,
- `docs/DOMAIN_SPECIFICATION.md` — provozní scénář, hranice a nové návrhové
  entity označené `PROPOSAL`,
- `docs/PLANNING_CONTRACT.md` — oddělení běžného týdenního běhu a návrhu
  operativní změny,
- `docs/DOMAIN_DECISIONS.md` — přesné otázky a jejich dopad na implementaci,
- `docs/ROADMAP.md` — pořadí implementačních kroků, blokátory a odložené
  oblasti.

Detailní implementační plán bude uložen samostatně v
`docs/superpowers/plans/` a bude obsahovat konkrétní soubory, rozhraní,
testovací scénáře a ověřovací příkazy.

## Kritéria schválení návrhu

Návrh je připravený pro plánování, pokud je zřejmé:

- co se implementuje jako první vertikální řez,
- co se pouze navrhuje a co je už ověřený fakt,
- která rozhodnutí musí dodat manager,
- že žádná varianta se nepoužije bez potvrzení,
- že neúplný nebo neověřený návrh zůstává blokovaný,
- že další krok nevyžaduje produkční integrace ani reálná data.
