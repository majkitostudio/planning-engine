# Návrh: omezený překladač plánovacích pokynů

## Záměr

Připravit bezpečný první krok k zadávání plánovacích pokynů běžným jazykem. AI
výhradně převede text manažera na jeden známý strukturovaný záměr. Plánování,
validace i rozhodnutí o použití záměru zůstávají v aplikaci a OR-Tools.

## Cíle

- Oddělit překlad pokynu od stávajícího Gemini poskytovatele, který vytváří celý
  návrh rozpisu.
- V první verzi podporovat pouze schválenou měkkou preferenci S6: střídání
  ranních a odpoledních směn mezi sousedními pracovními směnami i přes volno.
- Překlad vrací pouze záměr ze schváleného seznamu, nebo výsledek
  `nejasné` či `nepodporované`; nepřijímá nový text pravidla, kód ani libovolnou
  hodnotu.
- Server ověřuje výstup podle verzovaného kontraktu. Manažer před spuštěním
  plánování uvidí výklad a musí jej výslovně schválit.
- Teprve schválený záměr se deterministicky převede na existující
  `shiftRotationPreference` pro OR-Tools. Nezávislá validace zůstává beze změny.
- Zachovat ruční ovládání S6 jako plnohodnotnou možnost bez AI.

## Mimo rozsah a ochranné hranice

- Zaměstnanecké samoobslužné rozhraní, nové role a zaměstnanecké preference.
- Další manažerské preference nebo tvrdá pravidla; S1–S5 a jejich váhy zůstávají
  otevřenými otázkami domény.
- Generování či úprava rozpisu samotným překladačem, automatické schválení,
  autonomní smyčky, nový framework nebo nová infrastruktura.
- Posílání rosteru, jmen, identifikátorů, absencí, dostupnosti či jiných
  skutečných zaměstnaneckých údajů do Gemini. První integrační ověření používá
  pouze syntetické věty. Provozní volání zůstává vypnuté do samostatného
  schválení ochrany údajů a rozsahu zpracování.
- Tento návrh zatím nerozhoduje dobu uchování volného textu. Aktuálně se text
  pokynů ukládá se snímkem běhu; toto zpracování je třeba vyřešit před provozem.

## Zvažované přístupy

1. **Rozšířit Gemini plánovače.** Zamítnuto: stejný poskytovatel by nadále mohl
   vracet celý návrh a oddělení interpretace od plánování by nebylo vynucené.
2. **Přidat samostatný překladač s provider-neutrálním kontraktem a Gemini
   adaptérem.** Vybráno uživatelem: zachová malý rozsah, dovolí bezpečně
   validovat úzký výstup a nepředává překladači pravomoc plánovat.
3. **Použít pouze místní převod podle klíčových slov.** Zamítnuto pro tento
   krok: nevyužije schválený směr Gemini a nepokryje přirozené formulace.

## Návrh toku

1. Manažer vloží větu; překladač obdrží pouze její text a typ zadavatele.
2. Překladač vrátí verzovaný výsledek: známý záměr pro S6 s kanonickým
   vysvětlením, `nejasné`, nebo `nepodporované`.
3. Server odmítne neplatnou či neznámou strukturu. Nejasný nebo nepodporovaný
   pokyn se nepředá plánovači; aplikace nabídne ruční ovládání S6.
4. Manažer zkontroluje navržený výklad, může jej odmítnout a pouze výslovným
   schválením jej zpřístupní běhu OR-Tools.
5. OR-Tools a deterministická validace zpracují strukturovanou preferenci podle
   současných pravidel. AI překladač nerozhoduje, zda je výsledek přijatelný.

## Implementační hranice

- Zachovat stávající Next.js/TypeScript strukturu a testovací konvence.
- Přidat jen malé kontrakty a adaptéry v existujících `lib/planning/` a
  `lib/ai/`; nepřidávat závislosti, tabulky ani migrace, pokud se při
  implementaci neprokáže nezbytnost a nebude samostatně schválena.
- Po schválení tohoto návrhu připravit implementační plán pro omezenou
  syntetickou etapu. Samotná integrace do běžícího měsíčního toku a externí
  volání zůstávají za ochranou dat a samostatným rozhodnutím.

## Otevřené rozhodnutí

Před skutečným provozem určit, jak se volný text uchovává, kdo k němu smí
přistupovat a zda se po překladu ukládá pouze strukturovaný záměr. Návrh toto
rozhodnutí nepředjímá.
