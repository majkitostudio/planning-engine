# Projektová karta — Plánovací Engine

**Stav k:** 7. listopadu 2026  
**Stav projektu:** funkční pilotní verze ve vývoji  
**Charakter:** nekomerční ukázkový projekt pro jednoho manažera

## Cíl projektu

Usnadnit manažerovi sestavení měsíčního rozpisu směn. Aplikace připraví návrh s pomocí AI podle zadaných zaměstnanců, absencí, dostupnosti, požadovaného obsazení a dalších pokynů. Návrh následně nezávisle zkontroluje; o jeho potvrzení rozhoduje manažer.

## Aktuální stav

Základní měsíční plánovací tok je implementovaný. Podle výsledků dosavadního testování AI mimo demo režim vytvořila platný rozpis podle zadaných podmínek a kontrolovaných pravidel. To zatím neprokazuje spolehlivost pro všechny kombinace vstupů ani připravenost k běžnému provozu.

Při ukázce manažerům se projekt setkal s pozitivní odezvou. Další zpětná vazba k požadavkům zatím nebyla upřesněna.

## Co aplikace umí

- **Zadání:** výběr měsíce a zaměstnanců, zadání absencí a dostupnosti, požadovaného obsazení směn, pracovního fondu a slovních pokynů.
- **AI návrh:** vytvoření návrhu rozpisu pro celý kalendářní měsíc a jeho zobrazení po týdnech.
- **Nezávislá kontrola:** kontrola návrhu proti implementovaným pravidlům a obsazení; upozornění na problémy a chybějící podklady. Slovní pokyny nejsou deterministicky ověřovaným tvrdým pravidlem.
- **Rozhodnutí manažera:** návrh se ukládá odděleně a samotné vytvoření rozpis nemění. Neúplný nebo neověřený návrh nelze potvrdit.
- **Návaznost směn:** import exportu z rosteru, kontrola spárování zaměstnanců a uložení známých směn a výslovného volna pro návazné kontroly.
- **Přístup a správa:** přihlášení, rozlišení rolí manažera a uživatele pro prohlížení, uložení návrhů a audit významných změn.

## Dosavadní ověření

- **AI plánování — ověřeno při dosavadních testech:** podařilo se vytvořit platný rozpis. Pokrytí různých vstupů a provozní spolehlivost vyžadují další ověření.
- **Import rosteru — ověřeno při opakování:** říjnový export byl načten a uložen pro 29 spárovaných zaměstnanců; 71 nespárovaných řádků bylo přeskočeno.
- **Demo návrh — ověřeno při opakování:** listopadový návrh obsahoval směny ve všech 30 dnech a respektoval testovanou absenci. Validace však našla problémy bránící potvrzení.

Demo režim je simulace, nikoli AI plánovač; nezaručuje platný rozpis. Potvrzený rozpis nebyl při posledním opakování změněn.

## Omezení a rizika

| Oblast | Aktuální omezení |
| --- | --- |
| Kapacita AI | Při testování byl vyčerpán denní limit služby Cloudflare Workers AI, což dočasně brání dalším AI návrhům. |
| Problém z ukázky | Návrh obsahující pouze pět směn se při opakování nepodařilo vyvolat; jeho příčina zůstává neověřená. |
| Import | Nespárované řádky se přeskočí. Příčina původního neúspěšného importu při ukázce nebyla potvrzena. |
| Pravidla a kvalita | Některé doménové otázky čekají na rozhodnutí; kvalitu a spolehlivost je třeba ověřit na dalších scénářích. |
| Rozsah pilotu | Pilot je zaměřen na plné úvazky; částečné úvazky a integrace dalších systémů jsou mimo jeho rozsah. |
| Provoz | Jde o rozpracovanou pilotní aplikaci, nikoli o hotové řešení se zaručenou provozní úrovní. |

## Další postup

1. **Testování AI:** projít další měsíce a kombinace absencí a obsazení; sledovat kvalitu návrhů a spotřebu AI kvóty.
2. **Dohledání potíží z ukázky:** získat podmínky, za nichž vzniklo pět směn a selhal import, a pokusit se je reprodukovat.
3. **Pravidla:** s manažery vyjasnit zbývající otevřené otázky a rozlišit tvrdá pravidla od nezávazných preferencí.
4. **Použitelnost:** podle zkušeností zpřehlednit import, vysvětlení nálezů a rozdíl mezi AI a demo režimem.
5. **Ověření před širším použitím:** prověřit celý postup od vstupů přes návrh a kontrolu až po potvrzení, včetně spolehlivosti a bezpečnosti provozu.

## Rozsah a prostředí

- **Plánovaný provoz:** Vercel Hobby a stávající databáze Neon Free.
- **AI pro měsíční návrhy:** Cloudflare Workers AI; dostupnost závisí mimo jiné na limitech služby.
- **Integrace:** přímé napojení na jiné systémy není součástí současného pilotu.
- **Termín dokončení:** zatím nestanoven.
