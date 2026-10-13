// Katalog poziomów, części egzaminu i sesji.
// Sesja bez zadań (tasks) jest wyświetlana jako zablokowana (kłódka).
// Pliki z danymi sesji wywołują window.registerSession(...) — patrz README.md.
window.CATALOG = {
  levels: ["B1", "B2", "C1"],

  sections: {
    sluchanie: { title: "Słuchanie", subtitle: "Rozumienie ze słuchu", icon: "headphones", ai: false, showPoints: true },
    czytanie:  { title: "Czytanie",  subtitle: "Rozumienie tekstów pisanych", icon: "book", ai: true, showPoints: true },
    gramatyka: { title: "Gramatyka", subtitle: "Poprawność gramatyczna", icon: "grammar", ai: true, showPoints: true },
    mowienie:  { title: "Mówienie",  subtitle: "Część ustna · 40 punktów", icon: "mic", ai: true, showPoints: false },
    pisanie:   { title: "Pisanie",   subtitle: "Pisanie", icon: "pen", ai: true, showPoints: true }
  },

  // Sesje egzaminacyjne (od najnowszej). Bez załadowanych zadań — zablokowane.
  sessions: {
    B1: ["Luty 2024", "Kwiecień 2024", "Listopad 2023", "Kwiecień 2023", "Listopad 2022", "Marzec 2022", "Czerwiec 2021", "Marzec 2021"],
    B2: ["Kwiecień 2024", "Listopad 2023", "Kwiecień 2023", "Listopad 2022", "Marzec 2022", "Czerwiec 2021", "Marzec 2021"],
    C1: ["Kwiecień 2024", "Listopad 2023", "Kwiecień 2023", "Listopad 2022", "Marzec 2022", "Czerwiec 2021", "Marzec 2021"]
  },

  defaultPoints: 40
};

window.SESSIONS = {}; // "B1/gramatyka/kwiecien-2024" -> sesja

window.slugify = function (s) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
};

// levels: tablica poziomów, w których sesja ma się pojawić.
window.registerSession = function (levels, section, session) {
  levels.forEach(function (level) {
    var id = session.id || window.slugify(session.title);
    window.SESSIONS[level + "/" + section + "/" + id] = Object.assign({ id: id }, session);
  });
};
