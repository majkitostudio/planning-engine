# Úprava dema pro představení vedení

## Záměr

Připravit současné demo Plánovacího Engine tak, aby ho bylo možné během krátké
živé ukázky srozumitelně předvést vedení AAAAuto. Ukázka má vysvětlit přínos
nástroje bez předstírání, že jde o hotový produkční systém.

## Cíl

Člověk, který aplikaci vidí poprvé, má během několika kroků pochopit:

1. že se plánuje jeden týden směn,
2. že vstupy obsahují zaměstnance, absence, požadavky a potřebné obsazení,
3. že AI vytvoří návrh,
4. že návrh projde samostatnou kontrolou,
5. že návrh bez potvrzení managera nic nemění.

## Navržený přístup

Zachovat současné obrazovky a jejich funkce a upravit pouze texty, popisky a
pořadí vysvětlení tak, aby vedly návštěvníka jedním jasným příběhem. Součástí
změny bude oprava zjevných překlepů a odstranění formulací, které mohou působit
technicky nebo slibovat produkční napojení.

Zvažované možnosti:

- samostatný prezentační režim — odloženo, protože by přidával novou funkci,
- pouze externí scénář k ukázce — nedostatečné, protože aplikace by zůstala
  méně srozumitelná sama o sobě,
- úprava současného dema — zvolená varianta; je nejmenší, vratná a ověří zájem
  vedení bez rozšiřování produktu.

## Co upravíme

- hlavní texty na přehledu a stránce plánování,
- označení ukázkových dat a simulovaného běhu,
- vysvětlení rozdílu mezi návrhem, kontrolou a potvrzením,
- texty u spuštění scénářů a potvrzení návrhu,
- zjevné jazykové nepřesnosti a technické formulace viditelné při ukázce.

## Co neupravujeme

- žádné napojení na Outlook, CRM, roster ani produkční databázi,
- žádné produkční přihlášení,
- žádnou podporu částečných úvazků,
- žádná nová plánovací pravidla,
- žádná změna potvrzených víkendových časů,
- žádná změna chování AI, validace, ukládání nebo potvrzení.

## Ověření výsledku

- projít hlavní cestu dema od přehledu po potvrzení návrhu,
- ověřit všechny tři simulované scénáře: kompletní, částečný a neověřený,
- ověřit, že texty stále jasně označují demo a syntetická data,
- spustit `npm run lint`, `npm run typecheck`, `npm run test` a `npm run build`,
- zkontrolovat výsledný diff a čistotu pracovního stromu.

