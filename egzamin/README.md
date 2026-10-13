# Egzamin z polskiego — trening

Statyczna strona (HTML/CSS/JS, bez budowania). Otwórz `index.html` w przeglądarce
albo opublikuj folder przez GitHub Pages: `https://<user>.github.io/cv/egzamin/`.

## Struktura
- `data/catalog.js` — poziomy, części egzaminu, lista sesji (sesja bez danych = kłódka).
- `data/demo-*.js` — przykładowe testy (treść oryginalna).
- `app.js` — widoki: lista części, lista sesji, test z lukami, sprawdzanie i punktacja.

## Jak dodać prawdziwą sesję
1. Utwórz plik, np. `data/c1-gramatyka-kwiecien-2024.js`.
2. Dodaj go w `index.html` przed `app.js`.
3. Wypełnij według wzoru — `title` musi pasować do nazwy z `catalog.js`, wtedy kłódka znika:

```js
window.registerSession(["C1"], "gramatyka", {
  title: "Kwiecień 2024",
  name: "Poprawność gramatyczna",
  source: "certyfikatpolski.pl",
  tasks: [
    {
      points: 5,
      instruction: "Proszę – zgodnie z przykładami – …",
      example: "… (najciekawszą, <u>najciekawszych</u>, najciekawszym) …",
      content: ["Tekst akapitu z luką [[1]] i kolejną [[2]]."],
      gaps: {
        1: { options: ["a", "b", "c"], answer: "b" },        // lista rozwijana
        2: { hint: "zastanawiać się", answer: ["forma1", "forma2"] } // pole tekstowe, kilka poprawnych
      }
    },
    {
      points: 3,
      bank: ["lecz", "lub", "a"],          // ramka z wyrazami -> luki bez "options" wybierają z ramki
      content: ["… [[1]] …"],
      gaps: { 1: { answer: "lecz" } }
    }
  ]
});
```

Inne pola zadania:
- `text` — tekst do czytania (tablica akapitów) nad pytaniami.
- `audio: { src: "audio/plik.mp3" }` lub `audio: { tts: "tekst" }` (synteza mowy) + `transcript`.
- `type: "writing"` z `minWords` / `maxWords` — pole wypracowania z licznikiem słów.
- `type: "speaking"` — polecenie + nagrywanie odpowiedzi mikrofonem.
- `wide: true` w luce — szersze pole (całe zdania).

Punkty zadania dzielone są równo między luki.

## Sesja jako link do oficjalnego arkusza
Zamiast kopiować treść, sesja może otwierać oryginalny PDF organizatora:

```js
window.registerSession(["C2"], "czytanie", {
  title: "Listopad 2021",
  source: "certyfikatpolski.pl",
  pdf: "https://certyfikatpolski.pl/wp-content/uploads/.../Arkusz_egzaminacyjny.pdf"
});
```
