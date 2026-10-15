// Czytanie — teksty i pytania oryginalne. Miejsca i osoby są fikcyjne.
var PF = "*Prawda|Fałsz", FP = "Prawda|*Fałsz";
var PFB = "*Prawda|Fałsz|Brak informacji", FPB = "Prawda|*Fałsz|Brak informacji", BPF = "Prawda|Fałsz|*Brak informacji";

// ---------------- B1 ----------------
R("B1", "sasiadka", "Nowa sąsiadka", [
  "W zeszłym miesiącu do mieszkania obok wprowadziła się pani Halina. Ma siedemdziesiąt lat, ale jest bardzo aktywna: codziennie rano biega w parku, a po południu uczy się hiszpańskiego przez internet.",
  "Na początku trochę się jej bałam, bo zawsze była poważna i mówiła mało. Wszystko zmieniło się w deszczowy wtorek, kiedy zapomniałam kluczy. Pani Halina zaprosiła mnie do siebie, zrobiła mi gorącą herbatę i opowiedziała o swoich podróżach. Okazało się, że przez trzydzieści lat pracowała jako stewardesa i zwiedziła prawie cały świat.",
  "Teraz spotykamy się w każdą sobotę. Ja pomagam jej z komputerem, a ona uczy mnie piec ciasta. Moja mama mówi, że mam nową babcię."
], [
  ["Pani Halina mieszka obok od roku.", FP, "W tekście: „W zeszłym miesiącu do mieszkania obok wprowadziła się pani Halina” — mieszka tam od miesiąca, nie od roku."],
  ["Pani Halina uczy się języka obcego.", PF, "„Po południu uczy się hiszpańskiego przez internet.”"],
  ["Autorka poznała sąsiadkę lepiej, ponieważ…", "*zapomniała kluczy|poprosiła ją o pomoc z komputerem|spotkała ją w parku", "„Wszystko zmieniło się w deszczowy wtorek, kiedy zapomniałam kluczy.”"],
  ["Kim pracowała pani Halina?", "*stewardesą|nauczycielką hiszpańskiego|kucharką", "„Przez trzydzieści lat pracowała jako stewardesa.”"],
  ["Co robią razem w soboty?", "*Autorka pomaga z komputerem, a sąsiadka uczy ją piec ciasta.|Razem biegają w parku.|Uczą się razem hiszpańskiego.", "„Ja pomagam jej z komputerem, a ona uczy mnie piec ciasta.”"]
]);

R("B1", "kurs-gotowania", "Ogłoszenie: kurs gotowania", [
  "**Gotuj z nami! Kurs kuchni polskiej dla początkujących**",
  "Zapraszamy na sześć spotkań w Domu Kultury „Słonecznik” przy ulicy Lipowej 5. Zajęcia odbywają się we wtorki od 18.00 do 20.30. Pierwsze spotkanie — 7 października.",
  "Na kursie nauczysz się przygotowywać pierogi, żurek, bigos i sernik. Wszystkie produkty kupujemy my, ale prosimy o przyniesienie własnego fartucha i pojemnika na jedzenie, które zabierzesz do domu.",
  "Cena kursu: 360 zł. Studenci i emeryci płacą 300 zł. Liczba miejsc jest ograniczona — w grupie może być najwyżej dwanaście osób. Zapisy przez telefon lub osobiście w sekretariacie, od poniedziałku do piątku w godzinach 9.00–15.00."
], [
  ["Ile spotkań obejmuje kurs?", "*sześć|dwanaście|siedem", "„Zapraszamy na sześć spotkań.” Dwanaście to maksymalna liczba osób w grupie."],
  ["Uczestnicy muszą sami kupić produkty.", FP, "„Wszystkie produkty kupujemy my” — organizatorzy kupują produkty."],
  ["Co trzeba przynieść na zajęcia?", "*fartuch i pojemnik|produkty i noże|książkę kucharską", "„Prosimy o przyniesienie własnego fartucha i pojemnika na jedzenie.”"],
  ["Ile zapłaci emerytka?", "*300 zł|360 zł|60 zł", "„Studenci i emeryci płacą 300 zł.”"],
  ["Na kurs można zapisać się w sobotę w sekretariacie.", FP, "Sekretariat jest czynny „od poniedziałku do piątku w godzinach 9.00–15.00”."]
]);

R("B1", "list-z-wakacji", "Pozdrowienia znad jeziora", [
  "Kochana Marto!",
  "Piszę do Ciebie z małej wioski nad jeziorem. Jesteśmy tu już od tygodnia i jest cudownie, chociaż pierwsze dni nie były łatwe. Najpierw przez trzy dni padało, a potem Kuba zgubił telefon w lesie. Na szczęście znalazł go pan, który zbierał grzyby.",
  "Teraz pogoda jest piękna. Codziennie pływamy kajakiem, a wieczorem siedzimy przy ognisku. Nasz pensjonat jest prosty, ale bardzo czysty, a właścicielka gotuje najlepsze naleśniki na świecie. Jedyny problem to komary — jest ich mnóstwo!",
  "Wracamy w niedzielę wieczorem. Może spotkamy się w przyszłym tygodniu na kawę? Mam dla Ciebie mały prezent.",
  "Ściskam mocno, Ola"
], [
  ["Pierwsze dni wakacji były udane.", FP, "„Pierwsze dni nie były łatwe. Najpierw przez trzy dni padało…”"],
  ["Kto znalazł telefon Kuby?", "*mężczyzna, który zbierał grzyby|właścicielka pensjonatu|Ola", "„Znalazł go pan, który zbierał grzyby.”"],
  ["Co Ola robi codziennie?", "*pływa kajakiem|zbiera grzyby|piecze naleśniki", "„Codziennie pływamy kajakiem.”"],
  ["Co przeszkadza Oli na wakacjach?", "*komary|jedzenie|brud w pensjonacie", "„Jedyny problem to komary.” Pensjonat jest „bardzo czysty”."],
  ["Ola proponuje Marcie spotkanie w przyszłym tygodniu.", PF, "„Może spotkamy się w przyszłym tygodniu na kawę?”"]
]);

R("B1", "rower-miejski", "Rowery miejskie w Zielonym Polu", [
  "Od maja w Zielonym Polu działa system rowerów miejskich. W mieście jest czterdzieści stacji, a na każdej stoi od pięciu do piętnastu rowerów. Żeby wypożyczyć rower, trzeba zarejestrować się w aplikacji i wpłacić dziesięć złotych.",
  "Pierwsze dwadzieścia minut jazdy jest bezpłatne. Potem każda godzina kosztuje trzy złote. Rower można oddać na dowolnej stacji, nie tylko na tej, na której się go wypożyczyło.",
  "Mieszkańcy są zadowoleni, ale mają też uwagi. Najczęściej narzekają, że w centrum brakuje rowerów rano, kiedy wszyscy jadą do pracy. Urząd miasta obiecuje, że w przyszłym roku stacji będzie więcej. Rowery są dostępne od kwietnia do listopada — zimą system nie działa."
], [
  ["Ile stacji rowerowych jest w mieście?", "*czterdzieści|piętnaście|dwadzieścia", "„W mieście jest czterdzieści stacji.”"],
  ["Ile zapłacimy za jazdę trwającą piętnaście minut?", "*nic|trzy złote|dziesięć złotych", "„Pierwsze dwadzieścia minut jazdy jest bezpłatne.” Dziesięć złotych to wpłata przy rejestracji."],
  ["Rower trzeba oddać na tej samej stacji, na której się go wypożyczyło.", FP, "„Rower można oddać na dowolnej stacji.”"],
  ["Na co narzekają mieszkańcy?", "*na brak rowerów w centrum rano|na wysokie ceny|na zepsute rowery", "„Najczęściej narzekają, że w centrum brakuje rowerów rano.”"],
  ["W styczniu można wypożyczyć rower miejski.", FP, "„Rowery są dostępne od kwietnia do listopada — zimą system nie działa.”"]
]);

R("B1", "pielegniarka", "Mój dzień w pracy", [
  "Nazywam się Piotr i od ośmiu lat pracuję jako pielęgniarz w szpitalu dziecięcym. Ludzie często się dziwią, że mężczyzna wybrał ten zawód, ale ja nie wyobrażam sobie innej pracy.",
  "Mój dyżur zaczyna się o siódmej rano. Najpierw rozmawiam z koleżanką z nocnej zmiany, która mówi mi, co się działo w nocy. Potem podaję dzieciom leki, mierzę temperaturę i pomagam lekarzom podczas badań.",
  "Najtrudniejsze są chwile, kiedy dziecko płacze i tęskni za rodzicami. Wtedy czytam mu bajki albo opowiadam śmieszne historie. Najpiękniejszy moment to dzień, w którym mały pacjent zdrowy wraca do domu.",
  "Pracuję dwanaście godzin, więc wieczorem jestem bardzo zmęczony. Ale po trzech dniach pracy mam dwa dni wolne i wtedy jeżdżę na rowerze w góry."
], [
  ["Jak długo Piotr pracuje w szpitalu?", "*osiem lat|dwanaście lat|trzy lata", "„Od ośmiu lat pracuję jako pielęgniarz.”"],
  ["Co Piotr robi na początku dyżuru?", "*rozmawia z koleżanką z nocnej zmiany|podaje dzieciom leki|czyta bajki", "„Najpierw rozmawiam z koleżanką z nocnej zmiany.”"],
  ["Co Piotr robi, gdy dziecko tęskni za rodzicami?", "*czyta mu bajki|dzwoni do rodziców|daje mu leki", "„Wtedy czytam mu bajki albo opowiadam śmieszne historie.”"],
  ["Piotr uważa, że jego praca jest nudna.", FP, "Piotr mówi: „nie wyobrażam sobie innej pracy” i opisuje „najpiękniejszy moment” — praca daje mu radość."],
  ["W wolne dni Piotr…", "*jeździ na rowerze w góry|pracuje w innym szpitalu|odpoczywa w domu", "„Mam dwa dni wolne i wtedy jeżdżę na rowerze w góry.”"]
]);

R("B1", "targ", "Sobota na targu", [
  "W każdą sobotę rano chodzę z dziadkiem na targ. Dziadek mówi, że w supermarkecie wszystko jest takie samo i nie ma smaku, a na targu można porozmawiać ze sprzedawcą i spróbować produktów przed zakupem.",
  "Zawsze zaczynamy od stoiska pani Jadwigi, która sprzedaje sery i masło z własnego gospodarstwa. Potem kupujemy warzywa u pana Romana. Jego pomidory są brzydkie, ale bardzo słodkie. Na końcu idziemy po chleb do piekarza, który przyjeżdża z sąsiedniej wsi.",
  "Ceny na targu nie są niskie — niektóre rzeczy są nawet droższe niż w sklepie. Dziadek jednak uważa, że warto płacić więcej za dobrą jakość. Ja najbardziej lubię targ za to, że wszyscy się tu znają i zawsze dostaję od kogoś jabłko albo garść truskawek."
], [
  ["Dlaczego dziadek woli targ od supermarketu?", "*Bo można porozmawiać ze sprzedawcą i spróbować produktów.|Bo na targu jest taniej.|Bo targ jest blisko domu.", "„Na targu można porozmawiać ze sprzedawcą i spróbować produktów przed zakupem.”"],
  ["Co sprzedaje pani Jadwiga?", "*sery i masło|warzywa|chleb", "„Pani Jadwiga, która sprzedaje sery i masło.”"],
  ["Pomidory pana Romana są ładne, ale bez smaku.", FP, "„Jego pomidory są brzydkie, ale bardzo słodkie.”"],
  ["Na targu wszystko jest tańsze niż w sklepie.", FP, "„Niektóre rzeczy są nawet droższe niż w sklepie.”"],
  ["Za co autor najbardziej lubi targ?", "*za to, że wszyscy się znają|za niskie ceny|za duży wybór słodyczy", "„Najbardziej lubię targ za to, że wszyscy się tu znają.”"]
]);

// ---------------- B2 ----------------
R("B2", "praca-zdalna", "Biuro w salonie", [
  "Jeszcze kilka lat temu praca z domu była przywilejem nielicznych. Dziś w wielu firmach to codzienność. Zwolennicy pracy zdalnej podkreślają, że oszczędzają czas i pieniądze na dojazdach, a także mogą elastycznie planować dzień. Rodzice małych dzieci cenią możliwość odebrania dziecka z przedszkola bez proszenia szefa o wolne.",
  "Nie wszyscy jednak są zachwyceni. Część pracowników skarży się na samotność i brak kontaktu z zespołem. — Kiedyś przy kawie rozwiązywaliśmy problemy w pięć minut, teraz potrzebujemy na to godzinnej wideokonferencji — mówi Agnieszka, programistka z Poznania. Inni zauważają, że trudno im oddzielić życie zawodowe od prywatnego: laptop leży na kuchennym stole, więc wieczorem łatwo „jeszcze tylko” odpisać na maila.",
  "Coraz więcej firm wybiera więc model hybrydowy: dwa lub trzy dni w biurze, pozostałe w domu. Według specjalistów od zarządzania kluczem nie jest miejsce pracy, lecz jasne zasady — kiedy pracownik musi być dostępny, a kiedy ma prawo wyłączyć telefon."
], [
  ["Według tekstu praca zdalna pozwala zaoszczędzić na dojazdach.", PF, "„Oszczędzają czas i pieniądze na dojazdach.”"],
  ["Agnieszka uważa, że wideokonferencje przyspieszają rozwiązywanie problemów.", FP, "Agnieszka mówi, że kiedyś problem rozwiązywano „w pięć minut”, a teraz potrzeba „godzinnej wideokonferencji”."],
  ["Jaki problem pracy zdalnej opisano w drugim akapicie?", "*Trudność w oddzieleniu pracy od życia prywatnego.|Zbyt wysokie koszty internetu.|Brak odpowiedniego sprzętu.", "„Trudno im oddzielić życie zawodowe od prywatnego.”"],
  ["Na czym polega model hybrydowy?", "*Część dni pracuje się w biurze, a część w domu.|Pracuje się tylko w domu.|Pracownik sam wybiera godziny pracy w biurze.", "„Dwa lub trzy dni w biurze, pozostałe w domu.”"],
  ["Co według specjalistów jest najważniejsze?", "*jasne zasady dostępności pracownika|miejsce pracy|nowoczesny sprzęt", "„Kluczem nie jest miejsce pracy, lecz jasne zasady.”"]
]);

R("B2", "schronisko", "Wolontariusze z miską i smyczą", [
  "Schronisko dla zwierząt w Zielonym Polu istnieje od piętnastu lat i opiekuje się obecnie około stu dwudziestoma psami i czterdziestoma kotami. Pracuje tu zaledwie sześć osób na etatach, dlatego bez wolontariuszy placówka nie mogłaby funkcjonować.",
  "Wolontariuszem może zostać każdy, kto ukończył szesnaście lat. Osoby niepełnoletnie potrzebują jednak pisemnej zgody rodziców. Przed pierwszym spacerem z psem trzeba przejść krótkie szkolenie: opiekunowie uczą, jak bezpiecznie zakładać smycz i jak rozpoznać, że zwierzę jest zestresowane.",
  "— Najczęściej przychodzą do nas studenci i emeryci, ale ostatnio pojawia się też coraz więcej całych rodzin — mówi kierowniczka schroniska. Jej zdaniem wolontariat to nie tylko pomoc zwierzętom. Regularne spacery z psami często kończą się adopcją: w ubiegłym roku aż jedna trzecia zwierząt trafiła do domów wolontariuszy lub ich znajomych.",
  "Schronisko prosi też o dary: suchą karmę, stare koce i ręczniki. Nie przyjmuje natomiast lekarstw ani otwartych opakowań jedzenia."
], [
  ["Ile osób jest zatrudnionych w schronisku?", "*sześć|szesnaście|sto dwadzieścia", "„Pracuje tu zaledwie sześć osób na etatach.”"],
  ["Szesnastolatek może zostać wolontariuszem bez zgody rodziców.", FP, "„Osoby niepełnoletnie potrzebują jednak pisemnej zgody rodziców.”"],
  ["Czego dotyczy szkolenie dla wolontariuszy?", "*bezpiecznego obchodzenia się z psem|leczenia zwierząt|sprzątania boksów", "Szkolenie uczy, „jak bezpiecznie zakładać smycz i jak rozpoznać, że zwierzę jest zestresowane”."],
  ["Co według kierowniczki często wynika z wolontariatu?", "*adopcja zwierząt|praca w schronisku|darowizny pieniężne", "„Regularne spacery z psami często kończą się adopcją.”"],
  ["Schronisko przyjmuje otwarte opakowania karmy.", FP, "„Nie przyjmuje natomiast lekarstw ani otwartych opakowań jedzenia.”"]
]);

R("B2", "detoks", "Tydzień bez smartfona", [
  "Kiedy redakcja zaproponowała mi eksperyment — siedem dni bez smartfona — pomyślałem, że to będzie łatwe. Przecież nie jestem uzależniony, po prostu lubię być na bieżąco. Już pierwszego dnia okazało się, że się myliłem: sięgałem do pustej kieszeni średnio co kwadrans.",
  "Największym problemem nie były media społecznościowe, lecz drobne codzienne sprawy. Nie mogłem sprawdzić rozkładu autobusów, zapłacić telefonem w sklepie ani znaleźć drogi do nowej kawiarni, w której umówiłem się z przyjacielem. Musiałem kupić papierową mapę i zegarek z budzikiem.",
  "Po trzech dniach coś się jednak zmieniło. Zacząłem zauważać ludzi w tramwaju, przeczytałem książkę, która od roku leżała na półce, i zasypiałem szybciej niż zwykle. Przyjaciele żartowali, że wreszcie można ze mną normalnie porozmawiać.",
  "Czy wrócę do życia bez telefonu? Na pewno nie. Wprowadziłem jednak dwie zasady: telefon nie wchodzi do sypialni, a w czasie posiłków leży w innym pokoju."
], [
  ["Autor na początku uważał, że eksperyment będzie trudny.", FP, "„Pomyślałem, że to będzie łatwe.”"],
  ["Co było dla autora największym problemem?", "*codzienne sprawy, np. płatności i rozkład jazdy|brak mediów społecznościowych|nuda wieczorami", "„Największym problemem nie były media społecznościowe, lecz drobne codzienne sprawy.”"],
  ["Co musiał kupić autor?", "*mapę i zegarek z budzikiem|nowy telefon|bilet miesięczny", "„Musiałem kupić papierową mapę i zegarek z budzikiem.”"],
  ["Co zmieniło się po trzech dniach?", "*Autor szybciej zasypiał i więcej czytał.|Autor kupił nowy telefon.|Przyjaciele przestali się z nim kontaktować.", "„Przeczytałem książkę… i zasypiałem szybciej niż zwykle.”"],
  ["Jaką zasadę wprowadził autor po eksperymencie?", "*Telefon nie wchodzi do sypialni.|Korzysta z telefonu tylko w weekendy.|Całkowicie zrezygnował z telefonu.", "„Telefon nie wchodzi do sypialni, a w czasie posiłków leży w innym pokoju.”"]
]);

R("B2", "ksiegarnia-kawiarnia", "Kawa z literaturą w tle", [
  "Kiedy pięć lat temu Ewa i Michał otwierali na Starym Mieście kawiarnię połączoną z księgarnią, znajomi pukali się w czoło. Mówili, że ludzie nie czytają, a z kawy na wynos trudno się utrzymać. Dziś w weekendy trudno znaleźć tu wolny stolik.",
  "Sukces nie przyszedł od razu. Przez pierwszy rok właściciele dokładali do interesu z własnych oszczędności. Przełomem okazały się czwartkowe wieczory autorskie: lokalni pisarze czytają fragmenty swoich książek, a goście mogą zadawać pytania. Z czasem pojawiły się też klub dyskusyjny dla nastolatków i kącik dla dzieci.",
  "Książki można kupić, ale można je też po prostu przeczytać na miejscu przy filiżance kawy. — Niektórzy klienci przychodzą przez miesiąc, żeby skończyć jedną powieść. Nie mamy nic przeciwko temu, bo i tak zamawiają kawę i ciasto — śmieje się Michał.",
  "Właściciele przyznają, że nie konkurują z dużymi sklepami internetowymi ceną. Stawiają na atmosferę i doradztwo: każdy pracownik musi przeczytać przynajmniej jedną nową książkę w miesiącu, żeby móc ją polecać klientom."
], [
  ["Znajomi od początku wierzyli w sukces kawiarni.", FP, "„Znajomi pukali się w czoło” — uważali pomysł za szalony."],
  ["Jak wyglądał pierwszy rok działalności?", "*Właściciele musieli dokładać własne pieniądze.|Kawiarnia od razu przynosiła zysk.|Kawiarnia była zamknięta.", "„Przez pierwszy rok właściciele dokładali do interesu z własnych oszczędności.”"],
  ["Co okazało się przełomem?", "*wieczory autorskie|niskie ceny książek|sprzedaż internetowa", "„Przełomem okazały się czwartkowe wieczory autorskie.”"],
  ["Michałowi przeszkadza, że niektórzy klienci czytają książki na miejscu bez kupowania ich.", FP, "„Nie mamy nic przeciwko temu, bo i tak zamawiają kawę i ciasto.”"],
  ["Czym kawiarnia konkuruje z dużymi sklepami?", "*atmosferą i doradztwem|niższymi cenami|szybką dostawą", "„Stawiają na atmosferę i doradztwo.”"]
]);

R("B2", "ogrody-dachy", "Zielone dachy", [
  "Na dachu jednego z biurowców w centrum Zielonego Pola od dwóch lat rosną pomidory, zioła i truskawki. Ogród założyli pracownicy firmy, którzy mieli dość szarego widoku z okien. Dziś opiekuje się nim kilkanaście osób, a zbiory trafiają do firmowej stołówki.",
  "Zielone dachy mają wiele zalet. Latem chronią budynek przed przegrzaniem, więc firma rzadziej włącza klimatyzację. Rośliny zatrzymują też część wody deszczowej, co odciąża kanalizację podczas ulew. Poza tym dają schronienie pszczołom i ptakom.",
  "Założenie takiego ogrodu nie jest jednak proste ani tanie. Najpierw trzeba sprawdzić, czy konstrukcja budynku wytrzyma dodatkowy ciężar mokrej ziemi. Potrzebna jest też specjalna izolacja, która nie przepuści wody do wnętrza. — Najwięcej kosztowała nas ekspertyza i izolacja, a nie same rośliny — mówi inicjatorka projektu.",
  "Władze miasta zapowiadają, że od przyszłego roku właściciele budynków, którzy założą zielony dach, będą mogli liczyć na częściowy zwrot kosztów."
], [
  ["Kto założył ogród na dachu?", "*pracownicy firmy|władze miasta|właściciel stołówki", "„Ogród założyli pracownicy firmy.”"],
  ["Co dzieje się ze zbiorami z ogrodu?", "*trafiają do firmowej stołówki|są sprzedawane na targu|pracownicy zabierają je do domu", "„Zbiory trafiają do firmowej stołówki.”"],
  ["Która zaleta zielonych dachów została wymieniona w tekście?", "*Chronią budynek przed przegrzaniem.|Obniżają czynsz za biuro.|Zwiększają liczbę miejsc parkingowych.", "„Latem chronią budynek przed przegrzaniem.”"],
  ["Według inicjatorki najdroższe były rośliny.", FP, "„Najwięcej kosztowała nas ekspertyza i izolacja, a nie same rośliny.”"],
  ["Co zapowiadają władze miasta?", "*częściowy zwrot kosztów założenia zielonego dachu|zakaz zakładania ogrodów na dachach|darmowe rośliny dla mieszkańców", "„Będą mogli liczyć na częściowy zwrot kosztów.”"]
]);

R("B2", "jezyki-50", "Nigdy nie jest za późno", [
  "Barbara ma pięćdziesiąt osiem lat i od roku uczy się włoskiego. Zaczęła po przejściu na wcześniejszą emeryturę, bo — jak mówi — chciała udowodnić sobie, że jej mózg wciąż potrafi przyswajać nowe rzeczy. Teraz dwa razy w tygodniu chodzi na kurs, a wieczorami ogląda włoskie filmy z napisami.",
  "Przyznaje, że nauka idzie jej wolniej niż w młodości. Trudniej zapamiętuje nowe słówka, za to lepiej rozumie gramatykę, bo potrafi porównywać ją z polską i angielską, której uczyła się w szkole. Największą przeszkodą okazał się strach przed mówieniem. — Bałam się, że będę się ośmieszać błędami. Dopiero gdy zobaczyłam, że inni w grupie też się mylą, zaczęłam swobodniej rozmawiać.",
  "Lektorka Barbary zwraca uwagę, że dorośli uczniowie są zwykle bardziej zmotywowani od nastolatków, bo uczą się z własnego wyboru, a nie dlatego, że ktoś im każe. W przyszłym roku Barbara planuje miesięczny wyjazd do Bolonii, gdzie będzie mieszkać u włoskiej rodziny."
], [
  ["Dlaczego Barbara zaczęła się uczyć włoskiego?", "*Chciała udowodnić sobie, że nadal potrafi się uczyć.|Potrzebowała go w pracy.|Jej córka mieszka we Włoszech.", "„Chciała udowodnić sobie, że jej mózg wciąż potrafi przyswajać nowe rzeczy.”"],
  ["Barbara łatwiej niż w młodości zapamiętuje nowe słowa.", FP, "„Trudniej zapamiętuje nowe słówka.”"],
  ["Co pomaga Barbarze rozumieć gramatykę?", "*porównywanie z językiem polskim i angielskim|oglądanie filmów|lekcje prywatne", "„Potrafi porównywać ją z polską i angielską.”"],
  ["Co pomogło Barbarze pokonać strach przed mówieniem?", "*To, że inni w grupie też popełniali błędy.|Wyjazd do Włoch.|Rozmowy z lektorką po zajęciach.", "„Dopiero gdy zobaczyłam, że inni w grupie też się mylą, zaczęłam swobodniej rozmawiać.”"],
  ["Według lektorki dorośli są bardziej zmotywowani, bo…", "*uczą się z własnego wyboru|mają więcej czasu|płacą za kurs", "„Uczą się z własnego wyboru, a nie dlatego, że ktoś im każe.”"]
]);

// ---------------- C1 ----------------
R("C1", "ekonomia-dzielenia", "Pożyczone życie", [
  "Wiertarka, której przeciętny właściciel używa łącznie kilkanaście minut w ciągu całego życia, stała się symbolem tak zwanej ekonomii współdzielenia. Skoro większość przedmiotów przez większość czasu leży bezużytecznie, po co je kupować, skoro można je pożyczyć od sąsiada lub wynająć za drobną opłatą?",
  "Idea brzmi szlachetnie: mniej produkcji to mniej odpadów i niższe zużycie surowców. W praktyce jednak granica między dzieleniem się a zwykłym biznesem szybko się zaciera. Platformy, które zaczynały jako sąsiedzkie inicjatywy, przekształciły się w globalne korporacje, a mieszkania „udostępniane” turystom znikają z rynku najmu dla mieszkańców, windując czynsze w centrach miast.",
  "Krytycy zwracają też uwagę na kwestie pracownicze. Kierowcy czy kurierzy współpracujący z platformami formalnie są niezależnymi przedsiębiorcami, co oznacza brak płatnego urlopu i ubezpieczenia. Zwolennicy odpowiadają, że to właśnie elastyczność przyciąga wielu z nich — studentów, rodziców czy osoby szukające dodatkowego zarobku.",
  "Wydaje się, że przyszłość ekonomii współdzielenia zależy nie tyle od technologii, ile od regulacji: od tego, czy państwa zdołają chronić interes publiczny, nie dławiąc przy tym innowacji."
], [
  ["Przykład wiertarki ma pokazać, że…", "*wiele przedmiotów jest rzadko używanych|narzędzia są zbyt drogie|warto kupować sprzęt dobrej jakości", "Wiertarki używa się „kilkanaście minut w ciągu całego życia” — większość przedmiotów „leży bezużytecznie”."],
  ["Autor uważa, że granica między dzieleniem się a biznesem jest zawsze wyraźna.", FPB, "„Granica między dzieleniem się a zwykłym biznesem szybko się zaciera.”"],
  ["Jaki negatywny skutek wynajmu mieszkań turystom opisano w tekście?", "*wzrost czynszów dla mieszkańców|spadek liczby turystów|niszczenie zabytków", "Mieszkania „znikają z rynku najmu dla mieszkańców, windując czynsze”."],
  ["Wyraz „windując” w tekście oznacza:", "*podnosząc|obniżając|stabilizując", "„Windować ceny” = sztucznie je podnosić."],
  ["Według autora o przyszłości ekonomii współdzielenia zadecydują przede wszystkim…", "*regulacje prawne|nowe technologie|preferencje klientów", "„Zależy nie tyle od technologii, ile od regulacji.”"]
]);

R("C1", "miasto-15", "Wszystko w zasięgu spaceru", [
  "Koncepcja „miasta piętnastominutowego” zakłada, że każdy mieszkaniec powinien mieć w odległości kwadransa pieszo lub rowerem wszystko, czego potrzebuje na co dzień: sklep, szkołę, przychodnię, park i — w miarę możliwości — miejsce pracy. Jej zwolennicy przekonują, że takie planowanie ograniczy korki, poprawi jakość powietrza i wzmocni lokalne więzi.",
  "Pomysł nie jest tak nowatorski, jak twierdzą niektórzy. Przed epoką masowej motoryzacji większość miast funkcjonowała właśnie w ten sposób, bo innego wyjścia po prostu nie było. To dopiero dwudziestowieczne osiedla-sypialnie, oddalone od centrów usług, uczyniły samochód niezbędnym.",
  "Realizacja tej wizji napotyka jednak liczne przeszkody. Przekształcenie istniejącej zabudowy jest kosztowne, a lokalne usługi nie zawsze są w stanie przetrwać w mniej zaludnionych dzielnicach. Pojawiają się też obawy, że atrakcyjne, samowystarczalne dzielnice staną się zbyt drogie dla przeciętnych mieszkańców, co pogłębi podziały społeczne.",
  "W sieci krąży ponadto teoria, jakoby miasta piętnastominutowe miały służyć ograniczaniu swobody przemieszczania się. Urbaniści odpowiadają, że idea polega na tym, by nie musieć daleko jeździć, a nie na tym, by nie móc."
], [
  ["Co jest głównym założeniem koncepcji?", "*Codzienne potrzeby mają być dostępne w ciągu kwadransa pieszo lub rowerem.|Każdy powinien mieszkać w centrum.|Samochody mają być zakazane w miastach.", "„Każdy mieszkaniec powinien mieć w odległości kwadransa pieszo lub rowerem wszystko, czego potrzebuje.”"],
  ["Według autora pomysł jest całkowicie nowy.", FPB, "„Pomysł nie jest tak nowatorski, jak twierdzą niektórzy” — dawniej miasta tak funkcjonowały."],
  ["Co uczyniło samochód niezbędnym?", "*osiedla oddalone od centrów usług|rozwój transportu publicznego|wzrost cen mieszkań", "„Dwudziestowieczne osiedla-sypialnie, oddalone od centrów usług, uczyniły samochód niezbędnym.”"],
  ["Jaką obawę społeczną opisano w tekście?", "*Atrakcyjne dzielnice mogą stać się zbyt drogie.|Ludzie przestaną się spotykać.|Zamkną się szkoły.", "Samowystarczalne dzielnice mogą stać się „zbyt drogie dla przeciętnych mieszkańców”."],
  ["Jak urbaniści odpowiadają na teorię o ograniczaniu swobody?", "*Chodzi o to, by nie musieć jeździć, a nie o zakaz jeżdżenia.|Przyznają, że to prawda.|Nie odnoszą się do niej.", "„Idea polega na tym, by nie musieć daleko jeździć, a nie na tym, by nie móc.”"]
]);

R("C1", "nostalgia", "Dawniej było lepiej?", [
  "Niemal każde pokolenie jest przekonane, że młodość przypadła mu na lepsze czasy. Muzyka była ciekawsza, ludzie życzliwsi, a dzieci — grzeczniejsze. Psychologowie tłumaczą to zjawisko między innymi tym, że pamięć działa wybiórczo: z upływem lat przykre wspomnienia bledną szybciej niż przyjemne.",
  "Nostalgia ma jednak także pozytywną funkcję. Wspominanie dawnych chwil daje poczucie ciągłości i tożsamości, pomaga przetrwać trudne okresy i wzmacnia więzi z bliskimi, z którymi dzielimy wspólne historie. Nic dziwnego, że chętnie korzystają z niej specjaliści od marketingu, przywracając na rynek opakowania i smaki sprzed lat.",
  "Problem pojawia się wtedy, gdy idealizowana przeszłość staje się argumentem w debacie publicznej. Hasło „przywróćmy dawne czasy” bywa skuteczne właśnie dlatego, że odwołuje się do przeszłości, która w tej postaci nigdy nie istniała. Łatwo wtedy zapomnieć o niedostatkach, które kiedyś były codziennością — od braków w sklepach po ograniczony dostęp do edukacji.",
  "Warto więc pielęgnować wspomnienia, ale z pewną dozą dystansu: pamiętając, że to, co dziś wydaje się złotym wiekiem, dla ówczesnych ludzi było po prostu zwykłą, nieraz trudną teraźniejszością."
], [
  ["Według psychologów pamięć działa w ten sposób, że…", "*przykre wspomnienia bledną szybciej niż przyjemne|zapamiętujemy głównie złe chwile|wspomnienia z młodości są najdokładniejsze", "„Z upływem lat przykre wspomnienia bledną szybciej niż przyjemne.”"],
  ["Nostalgia ma według tekstu wyłącznie negatywne skutki.", FPB, "„Nostalgia ma jednak także pozytywną funkcję.”"],
  ["Jak marketing wykorzystuje nostalgię?", "*przywraca opakowania i smaki sprzed lat|organizuje spotkania dla seniorów|obniża ceny starych produktów", "Specjaliści od marketingu przywracają „na rynek opakowania i smaki sprzed lat”."],
  ["Dlaczego hasło „przywróćmy dawne czasy” bywa skuteczne?", "*Bo odwołuje się do wyidealizowanej przeszłości.|Bo dawniej naprawdę żyło się lepiej.|Bo młodzi ludzie znają historię.", "Odwołuje się „do przeszłości, która w tej postaci nigdy nie istniała”."],
  ["Do czego zachęca autor w zakończeniu?", "*do pielęgnowania wspomnień z dystansem|do zapomnienia o przeszłości|do powrotu do dawnych zwyczajów", "„Warto pielęgnować wspomnienia, ale z pewną dozą dystansu.”"]
]);

R("C1", "halas", "Niewidzialne zanieczyszczenie", [
  "O smogu mówi się coraz częściej, tymczasem inne zanieczyszczenie — hałas — wciąż bywa lekceważone. Szum ulicy, dźwięk przelatujących samolotów czy dudnienie muzyki zza ściany traktujemy jako nieunikniony koszt życia w mieście. Lekarze przestrzegają jednak, że długotrwała ekspozycja na hałas to nie tylko kwestia komfortu, lecz także zdrowia.",
  "Organizm reaguje na dźwięk nawet podczas snu. Nawet jeśli się nie obudzimy, ciało wydziela hormony stresu, a sen staje się płytszy. Skutkiem mogą być przewlekłe zmęczenie, problemy z koncentracją, a w dłuższej perspektywie podwyższone ciśnienie krwi.",
  "Walka z hałasem wymaga działań na wielu poziomach. Miasta budują ekrany akustyczne i wymieniają nawierzchnię jezdni na „cichy asfalt”, ograniczają prędkość w nocy i sadzą pasy zieleni. Architekci projektują budynki tak, by sypialnie znajdowały się od strony podwórza.",
  "Sporo możemy zrobić także sami: szczelne okna, zasłony z grubej tkaniny czy dywany potrafią wyraźnie wyciszyć mieszkanie. Najtrudniejsza bywa jednak zmiana nawyków — choćby rezygnacja z wieczornego koszenia trawnika czy głośnej muzyki w słuchawkach, która szkodzi przede wszystkim samym słuchającym."
], [
  ["Według autora hałas jest zanieczyszczeniem równie często omawianym jak smog.", FPB, "„O smogu mówi się coraz częściej, tymczasem… hałas — wciąż bywa lekceważony.”"],
  ["Co dzieje się z organizmem, gdy hałas nie budzi nas w nocy?", "*Wydziela hormony stresu, a sen staje się płytszy.|Nic się nie dzieje.|Szybciej się regeneruje.", "„Ciało wydziela hormony stresu, a sen staje się płytszy.”"],
  ["Które działanie miast NIE zostało wymienione w tekście?", "*zakaz używania samochodów w centrum|budowa ekranów akustycznych|sadzenie pasów zieleni", "Tekst wymienia ekrany, cichy asfalt, ograniczenie prędkości i zieleń — nie ma mowy o zakazie samochodów."],
  ["Jak architekci mogą ograniczać hałas?", "*projektując sypialnie od strony podwórza|budując wyższe budynki|stosując jaśniejsze kolory", "„Architekci projektują budynki tak, by sypialnie znajdowały się od strony podwórza.”"],
  ["Komu według autora szkodzi głośna muzyka w słuchawkach?", "*przede wszystkim samym słuchającym|sąsiadom|kierowcom", "Muzyka w słuchawkach „szkodzi przede wszystkim samym słuchającym”."]
]);

R("C1", "swiatlo-noca", "Gdzie się podziały gwiazdy?", [
  "Dla mieszkańca dużego miasta rozgwieżdżone niebo to rzadki widok, znany raczej z wakacji w górach niż z własnego balkonu. Winne jest zanieczyszczenie światłem — nadmiar sztucznego oświetlenia, które rozprasza się w atmosferze i tworzy nad miastami jasną łunę.",
  "Problem nie dotyczy wyłącznie astronomów. Sztuczne światło dezorientuje ptaki wędrowne i owady, zaburza rytm dobowy zwierząt i roślin. Także człowiek, przystosowany ewolucyjnie do naprzemienności dnia i nocy, gorzej sypia w otoczeniu, w którym nigdy nie zapada prawdziwa ciemność.",
  "Paradoksalnie znaczna część oświetlenia jest po prostu marnowana. Latarnie świecące we wszystkich kierunkach, a nie tylko w dół, reklamy włączone przez całą noc czy oświetlone puste biurowce to koszty, które ponoszą podatnicy i środowisko. Wymiana lamp na lepiej ukierunkowane i ograniczenie oświetlenia w późnych godzinach nie oznacza rezygnacji z bezpieczeństwa.",
  "Niektóre gminy tworzą już tak zwane parki ciemnego nieba, w których oświetlenie jest ściśle ograniczone. Przyciągają one turystów, gotowych przejechać setki kilometrów, by zobaczyć Drogę Mleczną."
], [
  ["Czym jest zanieczyszczenie światłem według tekstu?", "*nadmiarem sztucznego oświetlenia rozpraszającego się w atmosferze|smogiem w nocy|brakiem latarni w miastach", "„Nadmiar sztucznego oświetlenia, które rozprasza się w atmosferze.”"],
  ["Problem nocnego światła dotyczy tylko astronomów.", FPB, "„Problem nie dotyczy wyłącznie astronomów” — także zwierząt, roślin i ludzi."],
  ["Wyraz „łuna” w tekście oznacza:", "*jasną poświatę na niebie|rodzaj lampy|gwiazdozbiór", "Łuna to jasna poświata, np. nad oświetlonym miastem."],
  ["Co według autora jest przykładem marnowania światła?", "*latarnie świecące we wszystkich kierunkach|oświetlenie szpitali|lampy na przejściach dla pieszych", "„Latarnie świecące we wszystkich kierunkach, a nie tylko w dół.”"],
  ["Dlaczego parki ciemnego nieba przyciągają turystów?", "*Można w nich zobaczyć Drogę Mleczną.|Organizują tam koncerty.|Są tam tanie hotele.", "Turyści przyjeżdżają, „by zobaczyć Drogę Mleczną”."]
]);

R("C1", "jezyk-mlodziezy", "Czy młodzież psuje język?", [
  "Co jakiś czas w mediach powraca lament nad stanem polszczyzny. Młodzi ludzie — słyszymy — mówią niechlujnie, nadużywają anglicyzmów i skrótów, a ich słownictwo kurczy się z roku na rok. Językoznawcy zwykle przyjmują te alarmy ze spokojem.",
  "Przypominają, że język zawsze się zmieniał, a narzekania na „zepsutą mowę młodzieży” można znaleźć już w tekstach sprzed stuleci. Slang młodzieżowy pełni ważną funkcję: buduje poczucie wspólnoty i pozwala odróżnić się od dorosłych. Większość modnych słów szybko zresztą wychodzi z użycia, a tylko nieliczne na stałe zadomawiają się w języku ogólnym.",
  "Nie znaczy to, że problemu nie ma wcale. Kłopot pojawia się wtedy, gdy ktoś potrafi posługiwać się wyłącznie jednym rejestrem — tym potocznym — i nie umie dostosować sposobu mówienia do sytuacji. Ta sama osoba powinna umieć napisać luźną wiadomość do przyjaciela i formalne pismo do urzędu.",
  "Zdaniem wielu nauczycieli zamiast tępić slang, lepiej uczyć świadomości językowej: pokazywać, że różne sytuacje wymagają różnych środków wyrazu, i że bogactwo języka polega właśnie na umiejętności wyboru."
], [
  ["Jak językoznawcy reagują na alarmy o stanie polszczyzny?", "*ze spokojem|z niepokojem|z oburzeniem", "„Językoznawcy zwykle przyjmują te alarmy ze spokojem.”"],
  ["Narzekania na język młodzieży są zjawiskiem nowym.", FPB, "Narzekania „można znaleźć już w tekstach sprzed stuleci”."],
  ["Jaką funkcję pełni slang młodzieżowy?", "*buduje poczucie wspólnoty|ułatwia naukę języków obcych|zastępuje język literacki", "„Slang młodzieżowy… buduje poczucie wspólnoty i pozwala odróżnić się od dorosłych.”"],
  ["Na czym według autora polega prawdziwy problem?", "*na umiejętności posługiwania się tylko jednym rejestrem|na używaniu anglicyzmów|na pisaniu wiadomości", "„Kłopot pojawia się wtedy, gdy ktoś potrafi posługiwać się wyłącznie jednym rejestrem.”"],
  ["Co proponują nauczyciele?", "*uczyć świadomości językowej|zakazać slangu w szkołach|uczyć tylko języka literackiego", "„Zamiast tępić slang, lepiej uczyć świadomości językowej.”"]
]);

// ---------------- C2 ----------------
R("C2", "nuda", "Pochwała nudy", [
  "Nuda ma fatalną reputację. Kojarzy się z bezproduktywnością, marnowaniem czasu, a w skrajnych przypadkach — z życiową porażką. Nic dziwnego, że robimy wszystko, by jej uniknąć: w kolejce do kasy, na przystanku, a nawet w łazience odruchowo sięgamy po telefon, wypełniając każdą lukę w ciągu dnia strumieniem bodźców.",
  "Tymczasem coraz więcej badaczy kreatywności przekonuje, że nuda pełni funkcję, której nie sposób przecenić. To właśnie w chwilach, gdy umysł nie jest zajęty konkretnym zadaniem, swobodnie błądzi, łącząc odległe skojarzenia. Wielu twórców przyznaje, że najlepsze pomysły przychodziły im nie przy biurku, lecz podczas monotonnego spaceru czy zmywania naczyń.",
  "Rzecz jasna, nie każda nuda jest twórcza. Chroniczne znużenie, wynikające z poczucia bezsensu, może prowadzić do apatii, a nawet depresji. Różnica polega na tym, czy pustka jest chwilowym oddechem, czy stanem permanentnym, z którego nie widać wyjścia.",
  "Być może najcenniejszą umiejętnością w epoce nieustannej stymulacji okaże się zdolność do znoszenia bezczynności — bez natychmiastowego sięgania po rozrywkę. Paradoksalnie, by mieć coś ciekawego do powiedzenia, trzeba czasem pozwolić sobie na to, by przez chwilę nic nie robić."
], [
  ["Według autora współcześni ludzie…", "*odruchowo wypełniają każdą wolną chwilę bodźcami|lubią się nudzić|mają coraz więcej wolnego czasu", "„Odruchowo sięgamy po telefon, wypełniając każdą lukę w ciągu dnia strumieniem bodźców.”"],
  ["Dlaczego badacze kreatywności doceniają nudę?", "*Bo umysł niezajęty zadaniem swobodnie łączy skojarzenia.|Bo nuda zwiększa wydajność pracy.|Bo nuda pozwala lepiej wypocząć fizycznie.", "Gdy umysł nie jest zajęty, „swobodnie błądzi, łącząc odległe skojarzenia”."],
  ["Autor twierdzi, że każda nuda jest twórcza.", FPB, "„Rzecz jasna, nie każda nuda jest twórcza.”"],
  ["Od czego według autora zależy, czy nuda jest szkodliwa?", "*od tego, czy jest chwilowa, czy permanentna|od wieku człowieka|od wykonywanego zawodu", "„Różnica polega na tym, czy pustka jest chwilowym oddechem, czy stanem permanentnym.”"],
  ["Na czym polega paradoks z ostatniego akapitu?", "*Żeby mieć coś ciekawego do powiedzenia, trzeba czasem nic nie robić.|Rozrywka powoduje nudę.|Bezczynność jest najbardziej męcząca.", "„By mieć coś ciekawego do powiedzenia, trzeba czasem pozwolić sobie na to, by przez chwilę nic nie robić.”"]
]);

R("C2", "paradoks-wyboru", "Tyranie możliwości", [
  "Na półce w supermarkecie stoi kilkadziesiąt rodzajów jogurtu, w serwisie streamingowym czekają tysiące filmów, a aplikacja randkowa podsuwa niekończący się korowód potencjalnych partnerów. Intuicja podpowiada, że im większy wybór, tym większa szansa na satysfakcję. Doświadczenie bywa jednak przewrotne.",
  "Nadmiar opcji nierzadko paraliżuje. Zamiast cieszyć się z możliwości, odczuwamy niepokój, że przegapimy wariant lepszy od wybranego. Nawet po podjęciu decyzji nie opuszcza nas wrażenie, że gdzieś czekała alternatywa doskonalsza — co skutecznie podkopuje zadowolenie z tego, co mamy.",
  "Nie oznacza to bynajmniej, że należy tęsknić za czasami, gdy w sklepie był jeden rodzaj chleba. Swoboda wyboru jest zdobyczą, której nikt rozsądny nie chciałby oddać. Problem nie leży w samej liczbie możliwości, lecz w przekonaniu, że w każdej sprawie trzeba znaleźć rozwiązanie optymalne.",
  "Psychologowie odróżniają osoby dążące do maksymalizacji — przeszukujące wszystkie warianty — od tych, które zadowalają się opcją „wystarczająco dobrą”. Te drugie, choć obiektywnie nie zawsze wybierają najlepiej, częściej deklarują zadowolenie z życia. Być może więc sztuka wyboru polega w dużej mierze na sztuce rezygnacji."
], [
  ["Jak autor opisuje relację między wielkością wyboru a satysfakcją?", "*Intuicja sugeruje zależność, która w praktyce nie zawsze się sprawdza.|Większy wybór zawsze daje większą satysfakcję.|Wybór nie ma wpływu na satysfakcję.", "„Intuicja podpowiada, że im większy wybór, tym większa szansa na satysfakcję. Doświadczenie bywa jednak przewrotne.”"],
  ["Co według tekstu podkopuje zadowolenie z podjętej decyzji?", "*przekonanie, że istniała lepsza alternatywa|brak czasu na decyzję|wysoka cena produktów", "„Nie opuszcza nas wrażenie, że gdzieś czekała alternatywa doskonalsza.”"],
  ["Autor tęskni za czasami ograniczonego wyboru.", FPB, "„Nie oznacza to bynajmniej, że należy tęsknić za czasami, gdy w sklepie był jeden rodzaj chleba.”"],
  ["Gdzie według autora leży źródło problemu?", "*w przekonaniu, że zawsze trzeba znaleźć rozwiązanie optymalne|w liczbie dostępnych możliwości|w reklamie", "„Problem nie leży w samej liczbie możliwości, lecz w przekonaniu, że… trzeba znaleźć rozwiązanie optymalne.”"],
  ["Co charakteryzuje osoby zadowalające się opcją „wystarczająco dobrą”?", "*Częściej deklarują zadowolenie z życia.|Zawsze wybierają obiektywnie najlepiej.|Unikają podejmowania decyzji.", "„Te drugie… częściej deklarują zadowolenie z życia.”"]
]);

R("C2", "algorytmy", "Prawda skrojona na miarę", [
  "Jeszcze niedawno źródła informacji można było względnie łatwo rozróżnić: gazeta poważna i bulwarowa, dziennik telewizyjny i plotkarski magazyn. Dziś coraz większa część wiadomości dociera do nas za pośrednictwem algorytmów, które dobierają treści na podstawie naszych wcześniejszych kliknięć. W efekcie każdy z nas ogląda nieco inną wersję świata.",
  "Mechanizm ten nie jest z natury zły — trudno mieć pretensje do serwisu, że podsuwa miłośnikowi jazzu nowe płyty, a nie heavy metal. Kłopot zaczyna się wtedy, gdy ta sama logika obejmuje informacje o sprawach publicznych. Algorytm optymalizowany pod kątem zaangażowania premiuje treści wywołujące silne emocje, a emocje najsilniej rozbudza oburzenie.",
  "Rezultatem bywa polaryzacja: grupy o odmiennych poglądach nie tyle się spierają, ile funkcjonują w odrębnych rzeczywistościach, w których te same fakty — o ile w ogóle docierają — nabierają zupełnie innego znaczenia. Debata wymaga zaś wspólnego punktu odniesienia, choćby minimalnej zgody co do tego, co się wydarzyło.",
  "Remedium nie polega na demonizowaniu technologii ani na nostalgicznym powrocie do świata sprzed internetu. Potrzebna jest raczej przejrzystość — wiedza o tym, dlaczego widzimy to, co widzimy — oraz nawyk świadomego sięgania po źródła spoza własnej bańki."
], [
  ["Na podstawie czego algorytmy dobierają treści?", "*na podstawie wcześniejszych kliknięć użytkownika|losowo|na podstawie decyzji redaktorów", "Algorytmy „dobierają treści na podstawie naszych wcześniejszych kliknięć”."],
  ["Autor uważa, że personalizacja treści jest zawsze szkodliwa.", FPB, "„Mechanizm ten nie jest z natury zły” — problem dotyczy informacji o sprawach publicznych."],
  ["Dlaczego algorytmy premiują treści wywołujące oburzenie?", "*Bo są optymalizowane pod kątem zaangażowania, a oburzenie silnie angażuje.|Bo tak każe prawo.|Bo użytkownicy o to proszą.", "„Algorytm optymalizowany pod kątem zaangażowania premiuje treści wywołujące silne emocje, a emocje najsilniej rozbudza oburzenie.”"],
  ["Na czym według autora polega polaryzacja?", "*Grupy funkcjonują w odrębnych rzeczywistościach.|Ludzie przestają korzystać z internetu.|Wszyscy mają te same poglądy.", "Grupy „funkcjonują w odrębnych rzeczywistościach”."],
  ["Jakie rozwiązanie proponuje autor?", "*przejrzystość algorytmów i sięganie po różne źródła|zakaz mediów społecznościowych|powrót do gazet papierowych", "„Potrzebna jest raczej przejrzystość… oraz nawyk świadomego sięgania po źródła spoza własnej bańki.”"]
]);

R("C2", "przeklad", "Tłumacz — zdrajca czy sprzymierzeniec?", [
  "Włoskie powiedzenie zestawia tłumacza ze zdrajcą, sugerując, że każdy przekład nieuchronnie sprzeniewierza się oryginałowi. Coś w tym jest: gry słów, rytm zdania, kulturowe skojarzenia przywoływane przez pojedynczy wyraz rzadko dają się przenieść bez strat. Tłumacz poezji, zmuszony wybierać między wiernością sensowi a wiernością brzmieniu, zawsze coś poświęca.",
  "A jednak bez przekładu literatura światowa byłaby dla większości czytelników niedostępna. To dzięki tłumaczom możemy rozmawiać o rosyjskich powieściach czy japońskiej poezji, nie znając ani słowa po rosyjsku czy japońsku. Dobry przekład nie jest kopią, lecz nowym tekstem, który — paradoksalnie — bywa wierny właśnie dzięki odstępstwom od dosłowności.",
  "W ostatnich latach do dyskusji dołączyły programy tłumaczące maszynowo. Radzą sobie coraz lepiej z tekstami użytkowymi: instrukcjami, korespondencją, prostymi artykułami. Wciąż jednak zawodzą tam, gdzie znaczenie wynika z kontekstu, ironii czy intertekstualnych aluzji — czyli właśnie w literaturze.",
  "Być może więc zamiast pytać, czy tłumacz zdradza oryginał, należałoby zapytać, czego oczekujemy od przekładu: przezroczystej szyby czy raczej witrażu, przez który oryginał prześwituje w nowych barwach."
], [
  ["Co sugeruje włoskie powiedzenie przytoczone na początku?", "*Że każdy przekład zdradza oryginał.|Że tłumacze są nieuczciwi finansowo.|Że przekład jest lepszy od oryginału.", "Powiedzenie sugeruje, „że każdy przekład nieuchronnie sprzeniewierza się oryginałowi”."],
  ["Według autora dobry przekład jest dokładną kopią oryginału.", FPB, "„Dobry przekład nie jest kopią, lecz nowym tekstem.”"],
  ["Z czym według tekstu radzą sobie programy tłumaczące?", "*z tekstami użytkowymi, np. instrukcjami|z poezją|z ironią i aluzjami", "„Radzą sobie coraz lepiej z tekstami użytkowymi: instrukcjami, korespondencją…”"],
  ["Wyraz „intertekstualne” odnosi się do…", "*nawiązań do innych tekstów|błędów w tłumaczeniu|wymowy słów", "Aluzje intertekstualne to nawiązania do innych utworów."],
  ["Co symbolizuje witraż w ostatnim zdaniu?", "*przekład, który twórczo przekształca oryginał|przekład idealnie dosłowny|zniszczony oryginał", "Witraż, przez który oryginał „prześwituje w nowych barwach” — przekład twórczy, a nie przezroczysty."]
]);

R("C2", "list", "Elegia dla listu", [
  "Kiedy ostatnio napisałeś list? Nie wiadomość, nie maila, lecz list — na papierze, odręcznie, z nadzieją, że adresat otworzy kopertę za kilka dni. Dla wielu osób to pytanie brzmi niemal jak żart. Korespondencja, przez wieki główny sposób podtrzymywania relacji na odległość, stała się rytuałem równie rzadkim jak wysyłanie telegramów.",
  "Nie chodzi wyłącznie o nostalgię za papierem. List narzucał rytm, którego współczesna komunikacja nie zna. Skoro odpowiedź przychodziła po tygodniu, trzeba było przemyśleć każde zdanie, zebrać wydarzenia, wybrać to, co naprawdę warte opowiedzenia. Komunikator sprzyja raczej wymianie strzępów — szybkiej, ale często pozbawionej głębi.",
  "Historycy obawiają się też luki w źródłach. Listy wybitnych postaci, ale i zwykłych ludzi, stanowią bezcenny zapis epoki: obyczajów, języka, codziennych trosk. Tymczasem nasze wiadomości giną wraz z kolejnymi wymianami telefonu lub zamknięciem serwisu, w którym je przechowywaliśmy. Paradoksalnie najlepiej udokumentowana epoka w dziejach może okazać się dla przyszłych badaczy zaskakująco trudna do odczytania.",
  "Nie ma sensu wzywać do masowego powrotu do pióra. Warto jednak czasem napisać do kogoś dłużej i wolniej — choćby po to, by przekonać się, co mamy sobie do powiedzenia, gdy nie musimy odpowiadać natychmiast."
], [
  ["Jak autor przedstawia dziś pisanie listów?", "*jako rzadki rytuał|jako popularną modę|jako obowiązek urzędowy", "Korespondencja stała się „rytuałem równie rzadkim jak wysyłanie telegramów”."],
  ["Czym według autora list różnił się od współczesnej komunikacji?", "*Wymuszał przemyślenie i selekcję treści.|Był szybszy.|Był tańszy.", "„Trzeba było przemyśleć każde zdanie… wybrać to, co naprawdę warte opowiedzenia.”"],
  ["Czego obawiają się historycy?", "*luki w źródłach historycznych|zaniku umiejętności czytania|zamknięcia archiwów", "„Historycy obawiają się też luki w źródłach.”"],
  ["Na czym polega paradoks opisany w trzecim akapicie?", "*Epoka najlepiej udokumentowana może być trudna do odczytania.|Listy są dziś droższe niż kiedyś.|Ludzie piszą więcej, ale czytają mniej.", "„Najlepiej udokumentowana epoka w dziejach może okazać się… zaskakująco trudna do odczytania.”"],
  ["Autor nawołuje do całkowitego powrotu do listów papierowych.", FPB, "„Nie ma sensu wzywać do masowego powrotu do pióra.”"]
]);

R("C2", "pamiec-miasta", "Miasto jako palimpsest", [
  "Palimpsestem nazywano niegdyś rękopis, z którego zeskrobano pierwotny tekst, by zapisać na nim nowy — spod świeżych liter wciąż jednak prześwitywały dawne. Metafora ta znakomicie opisuje miasta, zwłaszcza te, które burzliwa historia wielokrotnie niszczyła i odbudowywała.",
  "W tkance miejskiej zapisują się kolejne epoki: średniowieczny układ ulic, dziewiętnastowieczne kamienice, powojenne bloki i szklane biurowce. Nazwy ulic zmieniano wraz z ustrojami, pomniki wznoszono i obalano, a pamięć o dawnych mieszkańcach — przesiedlonych, wygnanych lub zamordowanych — przetrwała nieraz tylko w szczątkowej formie: w napisie na fasadzie czy w nazwie, której sensu nikt już nie pamięta.",
  "Spór o to, co zachować, a co zastąpić nowym, rzadko jest sporem wyłącznie estetycznym. Decyzja o odbudowie zabytku lub o pozostawieniu ruin, o przywróceniu przedwojennej nazwy lub o upamiętnieniu nowych bohaterów, zawsze wyraża określoną wizję przeszłości — i wyklucza inne.",
  "Dlatego najciekawsze współczesne projekty urbanistyczne nie próbują wymazać żadnej z warstw ani udawać, że miasto ma jedną, spójną historię. Zamiast tego czynią widocznymi pęknięcia i nieciągłości, zapraszając mieszkańców do samodzielnej lektury miejskiego palimpsestu."
], [
  ["Czym był pierwotnie palimpsest?", "*rękopisem, na którym nowy tekst zapisano w miejscu zeskrobanego starego|mapą dawnego miasta|rodzajem pomnika", "„Rękopis, z którego zeskrobano pierwotny tekst, by zapisać na nim nowy.”"],
  ["Dlaczego metafora palimpsestu pasuje do miast?", "*Bo kolejne epoki nakładają się na siebie, a dawne ślady wciąż są widoczne.|Bo miasta mają wiele bibliotek.|Bo miasta rzadko się zmieniają.", "W miastach „zapisują się kolejne epoki”, a dawne warstwy wciąż „prześwitują”."],
  ["Spory o zachowanie zabytków są według autora wyłącznie estetyczne.", FPB, "„Spór o to, co zachować… rzadko jest sporem wyłącznie estetycznym.”"],
  ["Co według autora wyraża decyzja o odbudowie zabytku?", "*określoną wizję przeszłości|wyłącznie gust architekta|potrzeby turystów", "Decyzja „zawsze wyraża określoną wizję przeszłości — i wyklucza inne”."],
  ["Co cechuje projekty, które autor uznaje za najciekawsze?", "*Pokazują pęknięcia i nieciągłości historii miasta.|Odtwarzają jeden wybrany okres.|Usuwają ślady przeszłości.", "„Czynią widocznymi pęknięcia i nieciągłości.”"]
]);
