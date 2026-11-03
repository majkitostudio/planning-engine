# Návrh: měsíční MVP Plánovacího Enginu

## Záměr

MVP má managerovi pomoci sestavit jeden rozpis směn pro zvolený kalendářní měsíc podle předem zadaných parametrů a dodatečných pokynů v textovém poli. Plánování směn bude hlavní a výchozí pracovní část aplikace.

## Cíle

- Zadat kalendářní měsíc a dostupné plánovací vstupy, spustit AI a zobrazit jeden návrh pro celý měsíc.
- Kontrolovat známá potvrzená pravidla nad celým rozpisem, tedy i přes hranice týdnů.
- Před potvrzením zobrazit návrh, výsledek kontrol a omezení; změny se uloží až po potvrzení managerem.
- Dodatečný text předat AI jako pokyny. Výsledek popíše, jak s nimi naložil; text se sám nestává novým tvrdým pravidlem.
- Ostatní existující části přesunout z hlavní navigace do rozbalovací skupiny označené jako budoucí rozšíření MVP.

## Mimo rozsah

- Přidávání nových plánovacích pravidel nebo automatické převádění volného textu na závazná a ověřená pravidla.
- Rozšiřování nebo dokončování požadavků, dovolených, auditů, analýz, zaměstnanců a provozních náhrad jako součást tohoto řezu.
- Produkční nasazení, produkční data a nové integrace.

## Přístupy

1. **Jeden měsíční plán (vybráno managerem):** rozšířit vstupní a výstupní kontrakt AI, validaci, ukládání i rozhraní na celý měsíc. Umožňuje kontrolovat známé návaznosti mezi týdny; jde o větší změnu než opětovné použití týdenního běhu.
2. **Skládání samostatných týdnů:** znovu použít současný týdenní tok. Je menší změna, ale návaznosti mezi týdny nelze tímto postupem spolehlivě posoudit.

## Rozhodnutí a omezení

- Rozhodnutí managera z 30. 10. 2026: měsíční rozpis je nové MVP; ostatní funkce budou v rozbalovací navigaci označené jako budoucí rozšíření.
- Rozhodnutí managera: volný text je dodatečný pokyn pro AI; jeho interpretace se předloží managerovi k posouzení.
- Rozhodnutí managera: použije se jeden plán pro celý kalendářní měsíc a návaznosti mezi týdny.
- AI zůstává hlavní plánovací logikou, validace kontroluje jen schválená pravidla a návrh potvrzuje manager.
- Současný engine, API, persistence i demo data jsou založené na jednom týdnu; měsíční varianta vyžaduje jejich rozšíření. Simulované fixture samy o sobě neprokáží kvalitu měsíčního plánování.
- Měsíční vstupy se zadají v hlavním formuláři: měsíc, zaměstnanci, absence, dostupnost a minimální obsazení. Volný text je pokyn pro AI, nikoli automaticky tvrdé pravidlo.
- Pro kontroly na hranici měsíce se využijí dostupná data z předchozího a navazujícího rozpisu. Pokud potřebná historie chybí, kontrola se označí jako neověřená a neúplný plán nelze potvrdit.
- Časy směn se přebírají z `AGENTS.md`: ranní 7:45–16:30, všední odpolední 13:15–21:00, víkendová odpolední 12:45–21:00.
- Finální vizuální návrh manager schválil 31. 10. 2026. Název aplikace je **PPPlánovací Engine**. Rozpis směn je hlavní obrazovka; celou navigaci lze skrýt spodní šipkou a položka „Budoucí funkce“ je dole nad ní. Volno je znázorněno prázdnou buňkou bez „V“ a legenda se nezobrazuje. Vizuál používá menší vlevo zarovnané abstraktní logo a neutrálnější šedou paletu s omezenými barevnými akcenty. Obrázek je uložen v [`docs/design/mvp-final.png`](../../design/mvp-final.png).

## Stav po návrhu

Návrh a vizuální směr jsou schválené. V repozitáři nyní existují měsíční UI,
API, validace a persistence (`components/plan/monthly-planning-panel.tsx`,
`app/api/planning/monthly/`, `lib/planning/monthly-*`). Tato existence
nepotvrzuje, že celý pilot funguje v souvislém uživatelském průchodu.

Před hlavním testovacím průchodem doporučuje roadmapa připravit izolovanou
lokální databázi, syntetický účet a opakovatelné vstupy. Samotný průchod má
ověřit scénář od zadání měsíce až po opětovné načtení potvrzeného rozpisu,
včetně chybějící historie a blokace neúplného návrhu.
