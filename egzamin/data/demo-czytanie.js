// Przykładowy test — treść oryginalna (nie pochodzi z egzaminów państwowych).
(function () {
  var text = [
    "<b>Biblioteka w nowym miejscu</b>",
    "Miejska biblioteka w Zielonym Polu przeniosła się w tym roku do odnowionego budynku dawnej fabryki obuwia. Remont trwał prawie dwa lata i kosztował więcej, niż planowano, ale efekt zachwyca czytelników. Na trzech piętrach znajdują się czytelnia z widokiem na rzekę, sala dla dzieci, pracownia komputerowa oraz niewielka kawiarnia.",
    "Dyrektorka biblioteki, Joanna Wiśniewska, podkreśla, że nowe miejsce ma być czymś więcej niż wypożyczalnią książek. – Chcemy, żeby ludzie przychodzili tu spotkać się, porozmawiać, nauczyć się czegoś nowego – mówi. Dlatego w każdy czwartek odbywają się bezpłatne warsztaty, a w soboty – zajęcia językowe dla obcokrajowców.",
    "Nie wszyscy są jednak zadowoleni. Część starszych czytelników narzeka, że nowy budynek leży daleko od centrum. Władze miasta obiecują, że od stycznia uruchomią dodatkową linię autobusową."
  ];
  var PF = ["P", "F"];
  window.registerSession(["B1", "B2", "C1"], "czytanie", {
    id: "demo",
    demo: true,
    title: "Przykładowy test",
    name: "Rozumienie tekstów pisanych",
    tasks: [
      {
        points: 5,
        instruction: "Proszę przeczytać tekst i zdecydować, które zdania są prawdziwe (P), a które fałszywe (F).",
        text: text,
        content: [
          "1. Biblioteka działa teraz w budynku, w którym kiedyś produkowano buty. [[1]]",
          "2. Remont był tańszy, niż zakładano. [[2]]",
          "3. W bibliotece można napić się kawy. [[3]]",
          "4. Czwartkowe warsztaty są płatne. [[4]]",
          "5. Nowa linia autobusowa już kursuje. [[5]]"
        ],
        gaps: {
          1: { options: PF, answer: "P" },
          2: { options: PF, answer: "F" },
          3: { options: PF, answer: "P" },
          4: { options: PF, answer: "F" },
          5: { options: PF, answer: "F" }
        }
      },
      {
        points: 3,
        instruction: "Na podstawie tekstu z zadania I proszę wybrać poprawną odpowiedź.",
        content: [
          "1. Według dyrektorki biblioteka powinna przede wszystkim [[1]]",
          "2. Zajęcia dla obcokrajowców odbywają się [[2]]",
          "3. Starsi czytelnicy krytykują [[3]]"
        ],
        gaps: {
          1: { options: ["sprzedawać książki", "być miejscem spotkań", "organizować koncerty"], answer: "być miejscem spotkań" },
          2: { options: ["w czwartki", "w soboty", "codziennie"], answer: "w soboty" },
          3: { options: ["ceny w kawiarni", "lokalizację budynku", "godziny otwarcia"], answer: "lokalizację budynku" }
        }
      }
    ]
  });
})();
