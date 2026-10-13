// Przykładowy test — treść oryginalna (nie pochodzi z egzaminów państwowych).
window.registerSession(["B1", "B2", "C1"], "gramatyka", {
  id: "demo",
  demo: true,
  title: "Przykładowy test",
  name: "Poprawność gramatyczna",
  tasks: [
    {
      points: 5,
      instruction: "Proszę – zgodnie z przykładem – wybrać poprawne formy wyrazów podanych w nawiasach (odmiana rzeczowników, przymiotników i zaimków).",
      example: "Mój brat mieszka w (duży, <u>dużym</u>, dużego) mieście.",
      content: [
        "Co roku w lipcu jeździmy nad morze z [[1]] przyjaciółmi. Wynajmujemy mały domek niedaleko [[2]].",
        "Rano chodzimy na długie spacery po [[3]], a po południu odpoczywamy w [[4]] ogrodzie. Wieczorem często gramy w karty z [[5]] sąsiadami."
      ],
      gaps: {
        1: { options: ["naszymi", "naszych", "naszym"], answer: "naszymi" },
        2: { options: ["plaża", "plaży", "plażą"], answer: "plaży" },
        3: { options: ["lesie", "las", "lasu"], answer: "lesie" },
        4: { options: ["cienisty", "cienistym", "cienistego"], answer: "cienistym" },
        5: { options: ["miłych", "miłymi", "miłym"], answer: "miłymi" }
      }
    },
    {
      points: 4,
      instruction: "Proszę – zgodnie z przykładem – uzupełnić zdania wyrazami z ramki (spójniki). Uwaga! Jeden wyraz w ramce jest niepotrzebny.",
      example: "Myślę, <u>że</u> jutro będzie padać.",
      bank: ["bo", "ale", "czy", "kiedy", "dlatego"],
      content: [
        "Ania nie poszła wczoraj do pracy, [[1]] bardzo bolała ją głowa. Chciała zadzwonić do lekarza, [[2]] przychodnia była już zamknięta.",
        "Zapytała więc sąsiadkę, [[3]] ma jakieś leki. Poczuła się lepiej dopiero wieczorem, [[4]] wypiła ciepłą herbatę z miodem."
      ],
      gaps: {
        1: { answer: "bo" },
        2: { answer: "ale" },
        3: { answer: "czy" },
        4: { answer: "kiedy" }
      }
    },
    {
      points: 5,
      instruction: "Proszę – zgodnie z przykładem – uzupełnić tekst poprawnymi formami wyrazów podanych w nawiasach (czas teraźniejszy i przyszły).",
      example: "Codziennie rano Marek <u>pije</u> <u>(pić)</u> kawę.",
      content: [
        "W ten weekend moja rodzina [[1]] w góry. Zwykle w sobotę rano my [[2]] bardzo wcześnie.",
        "Jutro ja [[3]] plecaki, a mój mąż [[4]] bilety na pociąg. Mam nadzieję, że dzieci nie [[5]] na zmęczenie."
      ],
      gaps: {
        1: { hint: "jechać", answer: ["jedzie", "pojedzie"] },
        2: { hint: "wstawać", answer: "wstajemy" },
        3: { hint: "spakować", answer: "spakuję" },
        4: { hint: "kupić", answer: "kupi" },
        5: { hint: "narzekać", answer: ["będą narzekać", "będą narzekały", "będą narzekali", "narzekają"] }
      }
    },
    {
      points: 3,
      instruction: "Proszę – zgodnie z przykładem – zapytać o podkreśloną część zdania.",
      example: "Kasia czeka <u>na autobus</u>.<br>– Na co czeka Kasia?<br>– Na autobus.",
      content: [
        "1. Tomek pożyczył książkę <u>od kolegi</u>.<br>– <span class=\"hint\">(Od kogo?)</span> [[1]]<br>– Od kolegi.",
        "2. Spotkamy się <u>w piątek</u>.<br>– <span class=\"hint\">(Kiedy?)</span> [[2]]<br>– W piątek.",
        "3. Ola interesuje się <u>fotografią</u>.<br>– <span class=\"hint\">(Czym?)</span> [[3]]<br>– Fotografią."
      ],
      gaps: {
        1: { wide: true, answer: ["Od kogo Tomek pożyczył książkę?", "Od kogo pożyczył książkę Tomek?", "Od kogo Tomek pożyczył tę książkę?"] },
        2: { wide: true, answer: ["Kiedy się spotkamy?", "Kiedy spotkamy się?"] },
        3: { wide: true, answer: ["Czym interesuje się Ola?", "Czym Ola się interesuje?", "Czym się interesuje Ola?", "Czym Ola interesuje się?"] }
      }
    },
    {
      points: 3,
      instruction: "Proszę – zgodnie z przykładem – użyć wyrazu w nawiasie i przekształcić zdanie tak, by miało ten sam sens.",
      example: "Ewa świetnie gotuje.<br>(kucharką)<br>Ewa jest świetną kucharką.",
      content: [
        "1. Ten film bardzo mi się podoba.<br>(lubię)<br>[[1]]",
        "2. Marta nie umie pływać.<br>(potrafi)<br>[[2]]",
        "3. Jaka jest cena tej kurtki?<br>(kosztuje)<br>[[3]]"
      ],
      gaps: {
        1: { wide: true, hint: "lubię …", answer: ["Bardzo lubię ten film.", "Lubię bardzo ten film.", "Lubię ten film bardzo."] },
        2: { wide: true, hint: "potrafi …", answer: ["Marta nie potrafi pływać."] },
        3: { wide: true, hint: "kosztuje …", answer: ["Ile kosztuje ta kurtka?", "Ile ta kurtka kosztuje?"] }
      }
    }
  ]
});
