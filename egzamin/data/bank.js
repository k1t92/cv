// Rejestr ćwiczeń. Każdy plik z danymi wywołuje jedną z funkcji poniżej.
//
// Ćwiczenie (item) to tablica [pytanie, odpowiedź, wyjaśnienie]:
//   pytanie:  tekst; "___" = luka, [[tekst]] = podkreślenie, **tekst** = pogrubienie, \n = nowa linia
//   odpowiedź:
//     wybór:  "*poprawna|błędna|błędna"     (gwiazdka = poprawna, kolejność jest losowana)
//     wpis:   "=odpowiedź|inna dopuszczalna" (znak = na początku)
//   wyjaśnienie: reguła pokazywana po błędnej odpowiedzi.
window.BANK = { topics: [], reading: [], writing: [] };

// T(dział, poziom, id, tytuł, polecenie, ćwiczenia)
window.T = function (section, level, id, title, instruction, items) {
  window.BANK.topics.push({ section: section, level: level, id: level.toLowerCase() + "-" + id, title: title, instruction: instruction, items: items });
};

// R(poziom, id, tytuł, akapity, pytania) — pytania w formacie ćwiczeń.
window.R = function (level, id, title, text, questions) {
  window.BANK.reading.push({ level: level, id: level.toLowerCase() + "-" + id, title: title, text: text, items: questions });
};

// W(poziom, id, tytuł, forma, polecenie, minSłów, maxSłów, przydatne zwroty, lista kontrolna)
window.W = function (level, id, title, form, task, min, max, phrases, checklist) {
  window.BANK.writing.push({ level: level, id: level.toLowerCase() + "-" + id, title: title, form: form, task: task, min: min, max: max, phrases: phrases, checklist: checklist });
};
