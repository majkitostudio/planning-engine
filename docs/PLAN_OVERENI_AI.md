# Ověření měsíčního AI plánování

Tento dokument odděluje doložené běhy od dalšího ověřování. Všechny níže uvedené testovací běhy pracovaly se syntetickými daty a nic neuložily ani nepotvrdily v databázi. Starší podrobné poznámky jsou v [`archive/2026-11-07/PLAN_OVERENI_AI.md`](archive/2026-11-07/PLAN_OVERENI_AI.md).

## Doložené běhy

| Scénář | Výsledek | Omezení |
| --- | --- | --- |
| Integrační test Cloudflare, 7. 11. 2026 | API vrátilo neprázdný strukturovaný výstup s identifikátory zaměstnanců a daty v měsíci; 117,73 s. | Návaznosti byly záměrně neúplné a test připouštěl různé validační stavy. Neověřil platný ani potvrditelný plán. |
| Kvalitativní test, 4 syntetičtí zaměstnanci | Dva běhy měly 60/60 pozic, stav validace `valid` a čtyři neblokující nálezy chybějícího fondu; 68,1 s a 80,5 s. | Dva běhy nad malým scénářem nedokazují spolehlivost pro jiné měsíce nebo vstupy. Spotřeba kvóty nebyla přesně změřena. |
| Kompaktní zadání | 60/60 pozic, ale `invalid`: tři porušení nedostupnosti a jedno přiřazení zasahující do schválené absence; 86,7 s. | Výsledek neprokazuje, zda příčinou byla změna formátu zadání. AI není deterministická. |
| Starší volání 6. 11. | Jeden běh vrátil 101 přiřazení, `invalid` se 14 nálezy a 102 neověřenými kontrolami za 93 s; další pozdější pokus vrátil až 132 přiřazení a jeden nález. | Rozdílné verze zadání a promptu; nejde o srovnatelnou statistickou řadu. |

Jednotlivý validní výsledek dokládá, že daný běh splnil kontrolované podmínky. Nedokládá opakovatelnost v celé populaci vstupů, optimálnost, právní soulad ani produkční vhodnost.

## Další ověřování

Před dalším reálným voláním připravit vstupy a očekávané kontroly. Používat syntetická data, pokud není pro konkrétní běh výslovně schválen jiný postup.

1. Opakovat známý proveditelný scénář a zaznamenat provider/model, verzi vstupu, pokrytí, validační stav, nálezy a dobu.
2. Samostatně ověřit absence, dočasnou nedostupnost, hranice měsíce a týdne a nedostatečné obsazení.
3. Při neúplné historii potvrdit, že dotčené kontroly zůstávají `not_verified` a návrh nelze potvrdit.
4. Rozlišit chybu poskytovatele od nevalidního návrhu a od validního návrhu s nezávaznými upozorněními.
5. Pokud AI kvóta dojde, běh zastavit; automaticky nepřecházet na simulaci.

## Jak výsledky hodnotit

- `valid` je stav nezávislé validace, nikoli důkaz matematického optima.
- `invalid` značí konkrétní nalezená porušení; oprava promptu musí být znovu ověřena.
- `not_verified` značí nedostatek podkladů, nikoli automaticky porušení.
- Pokrytí směn a validita se reportují odděleně. Plný počet přiřazení sám o sobě neznamená platný rozpis.
- Volný text je pokyn. Jeho přítomnost ve vstupu sama nedokazuje, že ho AI správně pochopila nebo splnila.
- Pro přesný počet chybějících zaměstnanců je potřeba doložený výpočet; neúspěšný běh nestačí.

Příslušná implementace validace je `lib/planning/domain/month-validation.ts`; testy doménových pravidel jsou vedle ní. Rozsah aktuálních pravidel stanoví [`DOMAIN_SPECIFICATION.md`](DOMAIN_SPECIFICATION.md).
