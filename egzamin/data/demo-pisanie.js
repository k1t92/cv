// Przykładowe zadania — treść oryginalna.
window.registerSession(["B1", "B2", "C1"], "pisanie", {
  id: "demo",
  demo: true,
  title: "Przykładowy test",
  name: "Pisanie",
  tasks: [
    {
      title: "Zadanie I",
      points: 10,
      type: "writing",
      minWords: 50,
      maxWords: 80,
      instruction: "Proszę napisać e-mail (50–80 słów).",
      content: [
        "Przeprowadził(a) się Pan/Pani niedawno do nowego mieszkania. Proszę napisać e-mail do przyjaciela/przyjaciółki: opisać mieszkanie, napisać, co się Panu/Pani w nim podoba, a co nie, i zaprosić go/ją w odwiedziny."
      ]
    },
    {
      title: "Zadanie II",
      points: 20,
      type: "writing",
      minWords: 150,
      maxWords: 200,
      instruction: "Proszę napisać wypowiedź argumentacyjną (150–200 słów).",
      content: [
        "„Telefon komórkowy w szkole bardziej przeszkadza, niż pomaga”. Czy zgadza się Pan/Pani z tym stwierdzeniem? Proszę uzasadnić swoje zdanie."
      ]
    }
  ]
});
