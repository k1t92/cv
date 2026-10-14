# Polski B1–C2 — trening do egzaminu certyfikatowego

Statyczna strona (HTML/CSS/JS, bez budowania). Działa z GitHub Pages: `/cv/egzamin/`.

**Działy:** Gramatyka · Słownictwo (frazeologizmy, synonimy, antonimy, spójniki i partykuły) · Czytanie · Pisanie.
**Poziomy:** B1, B2, C1, C2. Wszystko otwarte, bez blokad. Ćwiczenia podzielone są na zestawy po 10; jest też „Losowy zestaw”.
Po sprawdzeniu każda błędna odpowiedź pokazuje poprawną formę i regułę („Dlaczego”). Najlepsze wyniki i szkice wypracowań zapisują się w przeglądarce.

Wszystkie ćwiczenia i teksty są oryginalne (osoby i miejsca w tekstach są fikcyjne).

## Dodawanie ćwiczeń
Najprościej w `data/wlasne.js`. Format (szczegóły w `data/_bank.js`):

```js
T("gramatyka", "B2", "moj-temat", "Tytuł tematu", "Polecenie.", [
  ["Zdanie z luką ___ .", "*poprawna|błędna|błędna", "Wyjaśnienie reguły."],   // wybór
  ["Wpisz formę ___ (czasownik).", "=forma|inna poprawna", "Wyjaśnienie."]      // wpisywanie
]);
```
`[[tekst]]` = podkreślenie, `**tekst**` = pogrubienie, `\n` = nowa linia.

## Kontrola jakości
`node egzamin/tools/validate.js` — sprawdza format, jedną poprawną odpowiedź, powtórzone opcje i pytania,
obecność wyjaśnień. Przycisk „zgłoś błąd” przy ćwiczeniu kopiuje jego numer (np. `#b1-aspekt-3`).
