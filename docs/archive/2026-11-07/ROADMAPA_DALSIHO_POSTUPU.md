# Roadmapa dalšího postupu

**Stav:** `PROPOSAL`, 7. 11. 2026. Prioritní pořadí je návrh práce, nikoli závazný termín ani tvrzení o dokončení. Platná rozhodnutí jsou v `DOMAIN_DECISIONS.md`; podrobný testovací postup v `PLAN_OVERENI_AI.md`.

## Výchozí situace

- `IMPLEMENTED`: AI měsíční návrh, nezávislá kontrola, import návazností a manažerské potvrzení.
- `VERIFIED` podle uživatele: při dosavadních AI testech vznikl platný rozpis. Přesný protokol těchto běhů v dokumentaci chybí; opakovatelnost není doložena.
- `VERIFIED`: při opakování importu byl uložen říjnový export pro 29 spárovaných zaměstnanců; simulovaný listopadový návrh obsahoval směny ve všech 30 dnech, ale kontrola zjistila porušení pravidel a návrh nebyl potvrzen.
- `NOT VERIFIED`: příčina původního neúspěchu importu a pěti směn; provozní spolehlivost, obnova, monitoring a plný aktuální průchod AI až po potvrzení.

## Teď — ověření skutečného plánovače

**Praktický cíl:** manažer zadá zaměstnance, potřebná obsazení, volna a
časová omezení směn a získá použitelný měsíční návrh nebo srozumitelný popis
známých nedostatků. Nejde o důkaz matematického optima. Zpracování libovolného
textu ani přesný počet dalších potřebných lidí nejsou zatím ověřenou funkcí.

**Priorita pilotu:** AI má samostatně sestavit použitelný rozpis; samostatné
hlídání docházky a správa požadavků, dovolených a nemocenských jsou budoucí
funkce. `OPEN QUESTION`: rozsah jednoduchých ručně zadaných volen a omezení
v samotném pilotním vstupu je nutné potvrdit. Neodstraňovat stávající vstupy
ani nepokládat tuto otázku za vyřešenou.

1. **Připravit syntetické scénáře a očekávání.** Začít jedním proveditelným měsícem, absencí a úplnými hranicemi; předem zaznamenat vstupy bez osobních údajů. Zkontrolovat automatické testy validace a formuláře.
2. **Provést omezený AI běh.** Zaznamenat poskytovatele, čas, pokrytí, validační stav, nálezy a případně měřitelnou spotřebu. První úspěch neopravňuje tvrdit, že všechny případy fungují. Při vyčerpané kvótě nepřepínat skrytě na simulaci.
3. **Navázat dalšími scénáři podle dostupné kvóty:** absence, neúplná návaznost a nemožné obsazení. Přehled scénářů a postup je v `PLAN_OVERENI_AI.md`.
4. **Ověřit manažerské zadání:** více období volna jedné osoby, dočasně pouze ranní směny jiné osoby a srozumitelné upozornění na nejasné datum. Strukturované omezení musí být zachováno pro nezávislou kontrolu; volný text sám není automaticky tvrdé pravidlo. Přirozenojazyčný převod a dotazování na nejasnosti označit jako dosud neověřené, dokud je neověří test.

**Kritérium uzavření:** existují reprodukovatelné vstupy a zaznamenané výsledky scénářů; vady jsou popsány včetně způsobu reprodukce, nepokryté oblasti zůstávají označené.

## Poté — chyby a srozumitelnost

1. Získat podmínky původní chyby s pěti směnami a neúspěšného importu; zkusit reprodukci, nepřisuzovat příčinu bez důkazu.
2. Podle výsledků opravit skutečně nalezené vady a doplnit regresní testy. Ověřit i vysvětlení nespárovaných řádků a rozdíl AI/simulace v rozhraní.
3. Překontrolovat implementovaná pravidla proti potvrzeným rozhodnutím; vracet manažerovi jen konkrétní dosud nerozhodnuté rozpory, ne již zodpovězené otázky.

**Kritérium uzavření:** reprodukované chyby mají test a ověřenou opravu; nereprodukované mají záznam o tom, co chybí k dalšímu šetření.

## Před širším použitím — průchod a provoz

1. Připravit bezpečný postup pro průchod návrh → kontrola → potvrzení → obnovení → návaznost a audit. Potvrzení a zápis do sdílené databáze vyžadují výslovné schválení konkrétní operace.
2. Ověřit přístupy a role, zálohu a obnovu, monitoring, zacházení s daty a aktuální stav cílového nasazení. Historické výsledky nasazení nenahrazují aktuální kontrolu.
3. Prověřit použitelnost v prohlížeči včetně mobilu a dostupnosti a zaznamenat zbytková rizika.

**Kritérium uzavření:** doložený průchod na schválených datech, zdokumentované provozní kontroly a rozhodnutí o zbývajících rizicích. Neznamená automatické schválení produkčního provozu.

## Později / mimo pilot

Částečné úvazky a integrace dalších systémů nejsou součástí pilotu. Další funkce zařadit až po výslovném rozhodnutí, nikoli na úkor výše uvedeného ověřování. Termíny a procento dokončení nejsou stanoveny.
