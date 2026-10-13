// Przykładowe zadania — treść oryginalna.
window.registerSession(["B1", "B2", "C1"], "mowienie", {
  id: "demo",
  demo: true,
  title: "Przykładowy test",
  name: "Część ustna",
  tasks: [
    {
      title: "Zadanie I",
      instruction: "Monolog. Proszę mówić przez około 2–3 minuty.",
      type: "speaking",
      content: [
        "Czy łatwiej jest dziś żyć w dużym mieście, czy na wsi? Proszę przedstawić argumenty za i przeciw oraz własne zdanie."
      ]
    },
    {
      title: "Zadanie II",
      instruction: "Dialog sytuacyjny. Proszę odegrać rolę opisaną poniżej.",
      type: "speaking",
      content: [
        "Kupił(a) Pan/Pani w sklepie internetowym kurtkę, która okazała się za mała. Proszę zadzwonić do sklepu, wyjaśnić problem i ustalić, jak można ją wymienić lub zwrócić."
      ]
    }
  ]
});
