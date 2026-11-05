# Prezentační scénář — Plánovací Engine (vedení firmy)

Krátce: ukázka MVP měsíčního plánování směn v call centru. Pro demo používejte
syntetická/anonymizovaná data. Migrace aktuální nakonfigurované DB jsou ověřené;
celkové produkční zabezpečení a provozní připravenost ověřené nejsou.

## 0. Příprava
- Spuštěná aplikace (`npm run dev`), přihlášený účet managera.
- Demo data načtena (zaměstnanci, absence, obsazení, fondy).

## 1. Přihlášení
- Otevřít `/prihlaseni`, přihlásit se jako manager.
- Ukázat rozdíl rolí: manager může generovat/potvrzovat, viewer jen prohlíží.
- (Volitelně) přihlásit viewer účet pro porovnání.

## 2. Hlavní tok — Rozpis směn (listopad)
1. Otevřít stránku Rozpis směn, zvolit listopad a období.
2. Přidat zaměstnance (plné nebo poloviční úvazky) ze syntetického/anonymizovaného seznamu.
3. Zadat absence (dovolená, nemoc) pro listopad.
4. Zadat potřebné obsazení (15/7 Po–Pá, 7/3 So–Ne).
5. Zadat fond práce a omluvené hodiny u každého zaměstnance.
6. Vygenerovat návrh (OR-Tools) — ověřit, že doběhne (timeout 120 s).
7. Zkontrolovat nálezy: problémy, neověřené, fond.
8. Potvrdit rozpis (pouze pokud `canConfirm === true`).
9. Ověřit, že potvrzený rozpis se zobrazí v týdenním pohledu.

## 3. Pravidla
- Otevřít stránku Pravidla.
- Ukázat potvrzená pravidla (časy obou úvazků, 35 h odpočinek po 6 dnech,
  dva dny volna po víkendu).

## 4. Nastavení
- Otevřít Nastavení, ukázat konfigurovatelné vstupy (obsazení, parametry).
- Ukázat týdenní staffing profil a upozornit, že konkrétní měsíční obsazení
  zůstává vstupem manažera.

## 5. Audit
- Otevřít Audit, ukázat filtr měsíce/akce, stránkování a dostupné detaily.
- Otevřít Analýzy, ukázat read-only souhrn potvrzených/odstraněných rozpisů.

## 6. Správa účtů
- Otevřít Správu účtů, ukázat vytvořený viewer účet pro demo.

## 7. Mobilní zobrazení
- Zmenšit okno na ~390 px, ověřit mobilní navigaci a sticky sloupec tabulek.

## Co není hotové (sdělit vedení)
- Rozsáhlejší analytika pokrytí a vytížení (aktuální Analýzy čerpají auditní události).
- Entra ID/Outlook není součástí MVP; provozní zabezpečení, zálohy, monitoring
  a obnovení databáze zůstávají `NOT VERIFIED`.
- Kvalita plánovacího výstupu pro produkci není ověřená.
