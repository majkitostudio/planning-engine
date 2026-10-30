# Správa přihlašovacích účtů v aplikaci — návrh

> Stav: managerem schváleno 30. 10. 2026. Implementace nezačala.

## Záměr

Umožnit managerovi zakládat a spravovat přihlašovací účty přímo v Planning
Engine. Uživatelská identita a role se budou načítat z PostgreSQL; přístup do
aplikace zůstane omezený rolemi `manager` a `viewer`.

## Co už existuje

- PostgreSQL tabulka `AppUser` uchovává identitu a roli pro potvrzení a audit.
- `AppUser` nemá heslo ani příznak změny hesla; `externalSubject` je povinný.
- Auth.js v lokálním režimu ověřuje jediný účet z proměnných prostředí. Tento
  režim je zakázán při `NODE_ENV=production`.
- Samoobslužná registrace, správa účtů a e-mailové doručování nejsou
  implementované.

## Cíle a hranice

- Manager může vytvořit účet s e-mailem, jménem a rolí `manager` nebo `viewer`,
  změnit jeho roli, deaktivovat jej a zadat mu nové dočasné heslo.
- Nový nebo resetovaný účet musí při příštím přihlášení změnit dočasné heslo.
- První manager se vytvoří jednorázovým bootstrap příkazem z tajné konfigurace;
  bootstrap selže, pokud už přihlašovací účet existuje, a nebude se spouštět při
  běžném startu aplikace.
- Pokud už `AppUser` obsahuje řádek se stejným normalizovaným e-mailem, bootstrap
  jej převezme a zachová ID i historické vazby; selže, pokud už tento řádek má
  heslo nebo se e-mail shoduje nejednoznačně. Manager toto chování potvrdil
  30. 10. 2026.
- Hesla se ukládají pouze jako bezpečný jednosměrný hash. Účty se nemažou,
  aby zůstaly zachované vazby na potvrzení a audit.
- Deaktivovaný účet nesmí pokračovat v používání existující session. Nelze
  deaktivovat ani změnit roli poslednímu aktivnímu managerovi.
- Bez e-mailové služby: manager předá uživateli dočasné heslo bezpečným
  samostatným kanálem.

Mimo rozsah: samoobslužná registrace, zapomenuté heslo přes e-mail, integrace
s CRM, změna doménových rolí a tvrzení o produkční připravenosti celé aplikace.

## Zvažované přístupy

1. **Jeden účet v proměnných prostředí:** neumožňuje správu více účtů v aplikaci,
   proto neplní záměr.
2. **Účty v PostgreSQL s lokálním heslem:** zvolený přístup. Navazuje na stávající
   `AppUser` a umožní managerovi spravovat účty bez externího identity systému.
   Vyžaduje bezpečné ověřování hesel, bootstrap prvního managera a migraci
   identity.
3. **Firemní Microsoft přihlášení:** neukládá hesla aplikací, ale účty zakládá
   správce firemní identity. Není to zde zvolený způsob správy účtů.

## Navržené chování

- Auth.js ověřuje e-mail a heslo vůči aktivnímu záznamu v `AppUser`.
- Manager-only stránka a API dovolují založit účet, upravit jméno/roli,
  deaktivovat účet a nastavit dočasné heslo. Není veřejná registrace.
- Heslo při vytvoření ani resetu nelze později zobrazit; dočasné heslo lze
  předat pouze při vytvoření/resetu a další přihlášení vynutí jeho změnu.
- Změna role nebo deaktivace se projeví i pro už existující session.
- Vznik a změny účtů se zaznamenají jako bezpečnostní auditní události, odděleně
  od přehledu potvrzených plánovacích změn.
- Migrace zachová existující záznamy `AppUser` i jejich vazby. Záznamy bez
  nastaveného hesla se nepovažují za přihlašovací účty do dokončení bootstrapu
  nebo správcem provedeného resetu.

## Přijetí

- První manager vznikne pouze jednorázovým bootstrapem; opakované spuštění jej
  nepřepíše ani nevytvoří duplicitní účet. Shodný existující záznam zachová ID,
  auditní a plánovací vazby.
- Manager může přidat druhého managera i viewera; viewer nesmí spravovat účty.
- Přihlášení ověřuje aktivní účet a nevratně hashované heslo; chybné heslo ani
  neaktivní účet nevytvoří session.
- Nový/resetovaný účet je před změnou dočasného hesla omezen na změnu hesla.
- Deaktivace a změna role se prosadí i bez čekání na vypršení JWT session.
- Posledního aktivního managera nelze deaktivovat ani změnit na viewera.
- Migrace zachová existující plánovací data a auditní vazby.
- Testy pokryjí autorizaci API, životní cyklus účtu, změnu/reset hesla,
  bootstrap, session a zpětnou kompatibilitu persistence.

## Implementační volby k potvrzení při detailním plánu

Hashovací algoritmus/knihovna, přesné proměnné bootstrapu a správa session se
ověří vůči závislostem projektu a zvolí bezpečná implementace. UI i API musí
zůstat manager-only; produkční provoz této funkce bude ověřen samostatně a
nebude automaticky vydáván za produkční připravenost celé aplikace.
