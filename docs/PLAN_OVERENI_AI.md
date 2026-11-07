# Plán ověření měsíčního AI plánování

**Stav:** částečně provedeno 7. 11. 2026. Dosavadní úspěšný AI návrh je hlášen uživatelem; jeho přesné vstupy a výstupy zde nejsou zachyceny.

## Integrační běh 7. 11. 2026

Se souhlasem uživatele byl jednou spuštěn `lib/ai/cloudflare-planning-provider.integration.test.ts` se syntetickými daty a skutečným Cloudflare Workers AI. Test prošel za 117,73 s: ověřil neprázdný strukturovaný návrh a platné identifikátory zaměstnanců a data v měsíci. Test má záměrně neúplné hranice a připouští všechny tři stavy validace; úspěch proto **nedokazuje platný ani potvrditelný rozpis**. Konzolový výstup neobsahoval počty přiřazení ani validační nálezy. Spotřeba neuronů ani zůstatek kvóty nebyly změřeny. Běh nic neukládal do databáze.

## Kvalitativní běh 7. 11. 2026

Se souhlasem uživatele byl jednou spuštěn samostatný kvalitativní scénář
`cloudflare-quality.integration.test.ts` se čtyřmi syntetickými zaměstnanci,
explicitní dostupností, absencí a úplnými syntetickými hranicemi. AI vrátila
60 přiřazení ve 30 dnech, pokryla 60 z 60 požadovaných pozic a nezávislá
validace vrátila `valid`, `canConfirm: true`, bez blokujících nebo neověřených
nálezů. Fond práce nebyl pro čtyři zaměstnance zadán, což vedlo ke čtyřem
neblokujícím nálezům `WORK_FUND_MISSING`. Běh trval 68,1 s, nic neuložil
do databáze a žádný rozpis nepotvrdil. Jediný malý scénář nedokazuje
opakovatelnost ani provozní kapacitu. Před během uživatel nahlásil 1,26k / 10k
neuronů; přesnou spotřebu běhu zatím nelze doložit bez následného stavu kvóty.

Na další výslovnou žádost uživatele proběhlo druhé volání stejného scénáře
se zobrazením syntetických přiřazení. Běh trval 80,5 s a opět vrátil 60/60
obsazených pozic, 30 dnů, stav `valid` a čtyři nezávazné nálezy chybějícího
fondu. Jednotlivá přiřazení byla zobrazena uživateli; neuložila se do databáze.
Počáteční hlášená spotřeba byla 2,18k neuronů, koncová zatím není známá.

### Ověření kompaktního zadání

Při samostatném lokálním testu se skutečnou AI nad upraveným kompaktním
formátem bylo pokryto 60/60 pozic, ale validace vrátila `invalid`: tři nálezy
nedostupnosti a jeden zásah do schválené absence (nálezy se mohou týkat stejného
přiřazení). Chyběly čtyři nezávazně zadávané fondy. Běh trval 86,7 s, nic
neuložil a rozpis nepotvrdil. Výsledek sám neprokazuje, že příčinou chyb je
změna formátu; AI není deterministická. Úprava promptu není ověřena pro
nasazení; spotřeba neuronů dosud není změřena.

## Cíl a hranice

Ověřit opakovatelnost návrhu a úplnost nezávislé kontroly bez záměny simulátoru za AI. Přednostně použít syntetická data a existující automatické testy. Reálné volání AI a zápis do sdílené databáze provádět pouze s odpovídajícím souhlasem; potvrzení rozpisu je samostatné rozhodnutí. Nezaznamenávat jména, volný text ani tajné údaje do výsledkového protokolu.

Testujeme praktickou použitelnost, nikoli matematickou optimalitu. Je-li
požadavek napsán pouze volným textem, nelze tvrdit, že ho deterministická
validace ověřila jako tvrdé pravidlo. Přesný počet chybějících lidí se uvádí
pouze při doloženém výsledku; jinak se popíší zjištěné mezery a nejistota.

## Scénáře

Syntetický kvalitativní scénář `lib/ai/fixtures/monthly-quality-fixture.ts`
obsahuje úplnou dostupnost, jednu absenci a syntetické úplné návaznosti.
Referenční návrh offline prochází validací. Samostatný živý test
`lib/ai/cloudflare-quality.integration.test.ts` vyžaduje explicitní
`RUN_CLOUDFLARE_QUALITY=1`; jeho úspěch sám o sobě není zárukou kvality AI.

| Priorita | Scénář | Co zaznamenat / očekávané ověření |
| --- | --- | --- |
| P0 | Opakování známého úspěšného scénáře s dostatečným obsazením a známými návaznostmi | Režim AI, úplnost pokrytí, stav a nálezy validace, délku běhu, spotřebu kvóty pokud dostupná. Nepředpokládat shodný výsledek. |
| P0 | Týdenní absence jednoho zaměstnance | Žádné přiřazení v době schválené absence; stav celkového pokrytí a validace. |
| P0 | Dvě oddělená období volna a dočasně jen ranní směna jiné osoby | Syntetické údaje převést na strukturované absence/nedostupnost a ověřit jejich dodržení; interpretace libovolného textu je samostatně `NOT VERIFIED`. |
| P0 | Chybějící návaznost před nebo po měsíci | Dotčená kontrola je neověřená; návrh nelze potvrdit, pokud chybějící podklady brání ověření. |
| P1 | Nedostatečná dostupnost nebo příliš vysoký požadavek na obsazení | Nedostatek je přiznán a podobsazený návrh nelze potvrdit; AI nesmí být hodnocena jen podle počtu přiřazení. |
| P1 | Směny přes hranici týdne a měsíce | Nezávislá kontrola 35 hodin po šesti dnech a dvou dnů volna při víkendové práci, v rozsahu dostupných podkladů. |
| P1 | Fond a slovní pokyny | Fond je nezávazný nález; AI může pokyny zohlednit, jejich splnění není deterministicky zaručeno. |
| P1 | Opakování po vyčerpání kvóty | Ověřit srozumitelnou chybu bez tichého přepnutí na simulaci; nevyčerpávat kvótu úmyslně. |

## Úsporný postup

1. Nejprve spustit existující lokální testy validace a formuláře; ty nespotřebují AI kvótu.
2. Pro skutečnou AI připravit vstupy a očekávané kontroly předem; začít jedním scénářem P0 a z dostupných měření zaznamenat počet volání a spotřebu. Neodhadovat kvótu ani nevyvozovat ji z délky běhu.
3. Pokud je limit vyčerpán, další AI běhy zastavit a pokračovat až po obnovení kvóty. Neslibovat konkrétní dobu obnovení bez ověření.
4. Výsledky evidovat odděleně pro AI a simulaci. U každého běhu uvést datum, anonymizovanou identifikaci scénáře, poskytovatele, stav úplnosti, validační nálezy, dobu, dostupnou spotřebu, výsledek a případná omezení.
5. Potvrzení, následná obnova a audit vyžadují samostatně schválený bezpečný postup; na sdílené databázi nepřepisovat ani neodstraňovat cizí záznamy.

Pro viditelný výstup integračního testu použít `--reporter=verbose`: základní
reporter v prostředí agenta v předchozím běhu konzolový souhrn nezobrazil.
Souhrn obsahuje počty nálezů podle kódů, nikoli jména či obsah zadání; sám
neměří spotřebu neuronů. Reálné volání vyžaduje samostatné schválení a kvótu.

## Mapování současných pravidel

Implementace `lib/planning/domain/month-validation.ts` kontroluje mimo jiné schválenou absenci, dostupnost, obsazení, překryvy, odpočinek po šesti dnech a víkendové volno; kontrola návazností může zůstat neověřená. Fond práce a střídání jsou samostatné nezávazné nálezy. Přesné chování a hranice určují testy a aktuální kód; žádné nové pravidlo se tímto plánem nezavádí.
