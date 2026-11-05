# Prezentační scénář — Plánovací Engine (vedení firmy)

Krátce: ukázka MVP měsíčního plánování směn v call centru. Demo používá
syntetická/anonymizovaná data; produkční auth/DB/integrace nejsou ověřené.

## 0. Příprava
- Spuštěná aplikace (`npm run dev`), přihlášený účet managera.
- Demo data načtena (zaměstnanci, absence, obsazení, fondy).

## 1. Přihlášení
- Otevřít `/login`, přihlásit se jako manager.
- Ukázat rozdíl rolí: manager může generovat/potvrzovat, viewer jen prohlíží.
- (Volitelně) přihlásit viewer účet pro porovnání.

## 2. Hlavní tok — Rozpis směn (listopad)
1. Otevřít stránku Rozpis směn, zvolit listopad a období.
2. Přidat zaměstnance (plné úvazky) z anonymizovaného seznamu.
3. Zadat absence (dovolená, nemoc) pro listopad.
4. Zadat potřebné obsazení (15/7 Po–Pá, 7/3 So–Ne).
5. Zadat fond práce a omluvené hodiny u každého zaměstnance.
6. Vygenerovat návrh (OR-Tools) — ověřit, že doběhne (timeout 120 s).
7. Zkontrolovat nálezy: problémy, neověřené, fond.
8. Potvrdit rozpis (pouze pokud `canConfirm === true`).
9. Ověřit, že potvrzený rozpis se zobrazí v týdenním pohledu.

## 3. Pravidla
- Otevřít stránku Pravidla.
- Ukázat potvrzená pravidla (časy směn, 35 h odpočinek po 6 dnech,
  dva dny volna po víkendu).

## 4. Nastavení
- Otevřít Nastavení, ukázat konfigurovatelné vstupy (obsazení, parametry).
- Zmínit, že částečné úvazky jsou plánované (Milník 7).

## 5. Audit
- Otevřít Audit, ukázat alespoň jeden potvrzený záznam (snapshot + událost).
- Stránka Analyzy je placeholder s odkazem na Audit.

## 6. Správa účtů
- Otevřít Správu účtů, ukázat vytvořený viewer účet pro demo.

## 7. Mobilní zobrazení
- Zmenšit okno na ~390 px, ověřit mobilní navigaci a sticky sloupec tabulek.

## Co není hotové (sdělit vedení)
- Částečné úvazky (plánované).
- Produkční autentizace (Entra ID) a produkční DB.
- Analytika (Milník 2).
- Kvalita plánovacího výstupu pro produkci není ověřená.