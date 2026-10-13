// Przykładowy test — treść oryginalna. Nagranie odtwarzane syntezą mowy (pl-PL).
// Dla prawdziwych nagrań użyj: audio: { src: "audio/plik.mp3" }.
(function () {
  var script = "Dzień dobry, mówi Radio Zielone Pole. Zapraszamy na najważniejsze informacje z regionu. " +
    "W sobotę na rynku odbędzie się festiwal pierogów. Początek o godzinie jedenastej, wstęp jest wolny. " +
    "Organizatorzy przypominają, że z powodu festiwalu ulica Długa będzie zamknięta dla samochodów od piątku wieczorem do niedzieli rano. " +
    "A teraz pogoda. W weekend będzie słonecznie, ale chłodno – temperatura nie przekroczy dziesięciu stopni. " +
    "W niedzielę po południu możliwe są przelotne opady deszczu.";
  var PF = ["P", "F"];
  window.registerSession(["B1", "B2", "C1"], "sluchanie", {
    id: "demo",
    demo: true,
    title: "Przykładowy test",
    name: "Rozumienie ze słuchu",
    tasks: [
      {
        points: 5,
        instruction: "Proszę wysłuchać komunikatu radiowego i zdecydować, które zdania są prawdziwe (P), a które fałszywe (F).",
        audio: { tts: script },
        transcript: script,
        content: [
          "1. Festiwal pierogów odbędzie się w niedzielę. [[1]]",
          "2. Za wejście na festiwal trzeba zapłacić. [[2]]",
          "3. Ulica Długa będzie zamknięta od piątku wieczorem. [[3]]",
          "4. W weekend temperatura wyniesie ponad dziesięć stopni. [[4]]",
          "5. W niedzielę po południu może padać deszcz. [[5]]"
        ],
        gaps: {
          1: { options: PF, answer: "F" },
          2: { options: PF, answer: "F" },
          3: { options: PF, answer: "P" },
          4: { options: PF, answer: "F" },
          5: { options: PF, answer: "P" }
        }
      }
    ]
  });
})();
