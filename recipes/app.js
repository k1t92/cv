(function () {
  "use strict";

  // ───────── справочники
  var CATS = {
    chicken: ["Курица", "🍗"],
    pork: ["Свинина", "🥓"],
    beef: ["Говядина", "🥩"],
    seafood: ["Рыба и морепродукты", "🦐"],
    other: ["Баранина, индейка, без мяса", "🥘"]
  };
  var CUIS = {
    asia: "Азия", india: "Индия", italy: "Италия", europe: "Европа", caucasus: "Кавказ",
    mideast: "Ближний Восток", mexico: "Мексика", rus: "Домашняя", usa: "США", latam: "Латинская Америка"
  };
  var TYPES = { main: "Основное", soup: "Суп", noodles: "Паста и лапша", breakfast: "Завтрак" };
  var LVL = ["", "Просто", "Средне", "Сложно"];

  var COLS = [
    { id: "freeze", t: "Заморозить впрок", d: "Готовим один раз — едим месяц. В каждом рецепте есть инструкция по заморозке и разогреву.", f: function (r) { return !!r.fr; } },
    { id: "quick", t: "Быстро: до 30 минут", d: "Ужин быстрее, чем приедет доставка.", f: function (r) { return r.time <= 30; } },
    { id: "unique", t: "Необычный вкус", d: "Сычуаньский перец, карамель с рыбным соусом, ореховые и тамариндовые соусы.", f: function (r) { return r.tags.u; } },
    { id: "protein", t: "Много белка", d: "От 40 г белка в одной порции.", f: function (r) { return r.n.p >= 40; } },
    { id: "light", t: "Полегче: до 500 ккал", d: "Сытно, но без тяжести.", f: function (r) { return r.n.k <= 500; } },
    { id: "budget", t: "Бюджетные ужины", d: "Простые продукты и честные порции.", f: function (r) { return r.tags.budget; } },
    { id: "onepan", t: "Одна сковорода", d: "Минимум посуды после ужина.", f: function (r) { return r.tags.onepan; } },
    { id: "spicy", t: "Поострее", d: "Для тех, кто любит с огоньком.", f: function (r) { return r.tags.spicy; } },
    { id: "prep", t: "Заготовки на неделю", d: "Большие порции, которые удобно разложить по контейнерам.", f: function (r) { return r.tags.prep; } }
  ];
  var COL = {}; COLS.forEach(function (c) { COL[c.id] = c; });

  // ───────── утилиты
  var CREDITS = window.CREDITS || {};
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var app = $("#app"), tabsEl = $("#tabs"), sheetEl = $("#sheet"), toastEl = $("#toast");
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function norm(s) { return String(s).toLowerCase().replace(/ё/g, "е"); }
  function plural(n, f) { var a = Math.abs(n) % 100, b = a % 10; return f[a > 10 && a < 20 ? 2 : b === 1 ? 0 : b >= 2 && b <= 4 ? 1 : 2]; }
  function fmtTime(m) { if (m < 60) return m + " мин"; var h = Math.floor(m / 60), r = m % 60; return h + " ч" + (r ? " " + r + " мин" : ""); }
  var FR = { 0.25: "¼", 0.5: "½", 0.75: "¾" };
  function frac(x) { var w = Math.floor(x + 1e-9), r = Math.round((x - w) * 100) / 100; return (w ? w : "") + (FR[r] || "") || "0"; }
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add("on");
    clearTimeout(toast.t); toast.t = setTimeout(function () { toastEl.classList.remove("on"); }, 1900);
  }

  // ───────── подготовка данных
  var BY = {};
  function parseIng(s) {
    return s.split(";").map(function (x) { return x.trim(); }).filter(Boolean).map(function (x) {
      if (x[0] === "#") return { h: x.slice(1).trim() };
      var parts = x.split(":"), m = parts[0].trim().split(/\s+/), q = m[1].split("*");
      return { k: m[0], a: +q[0] || 0, e: q[1] ? +q[1] : 1, note: parts[1] ? parts[1].trim() : "" };
    });
  }
  function unitOf(k) { return ING[k][6] || "г"; }
  function gramsPer(k) { var g = ING[k][7]; return g == null ? 1 : g; }
  function nutr(r) {
    var n = { k: 0, p: 0, f: 0, c: 0 };
    r.items.forEach(function (it) {
      if (it.h || !it.a) return;
      var g = ING[it.k], w = it.a * it.e * gramsPer(it.k) / 100;
      n.k += g[2] * w; n.p += g[3] * w; n.f += g[4] * w; n.c += g[5] * w;
    });
    for (var x in n) n[x] /= r.serv;
    return n;
  }
  RECIPES.forEach(function (r) {
    r.items = parseIng(r.ing);
    var t = {}; (r.tags || []).forEach(function (x) { t[x] = 1; }); r.tags = t;
    r.type = r.type || "main"; r.lvl = r.lvl || 1;
    r.n = nutr(r);
    r.hay = norm([r.t, r.d, CATS[r.cat][0], CUIS[r.cu], TYPES[r.type],
      r.items.filter(function (i) { return !i.h; }).map(function (i) { return ING[i.k][0]; }).join(" ")].join(" "));
    BY[r.id] = r;
  });

  // ───────── состояние (localStorage)
  var KEY = "povareshka.v1";
  var S = { saved: [], list: {}, checked: {}, recent: [], extra: [] };
  try { var raw = JSON.parse(localStorage.getItem(KEY) || "null"); if (raw) for (var k0 in S) if (raw[k0] != null) S[k0] = raw[k0]; } catch (e) { }
  S.saved = S.saved.filter(function (id) { return BY[id]; });
  S.recent = S.recent.filter(function (id) { return BY[id]; });
  for (var lid in S.list) if (!BY[lid]) delete S.list[lid];
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
  var servMem = {}; // выбранные порции на странице рецепта (пока не в списке)
  function servOf(r) { return S.list[r.id] || servMem[r.id] || r.serv; }
  function listCount() { return Object.keys(S.list).length; }

  // ───────── количества
  function fmtQty(k, amt, up) {
    if (!amt) return "";
    var u = unitOf(k);
    if (u === "г" || u === "мл") {
      var v = amt < 10 ? Math.max(1, Math.round(amt)) : amt < 50 ? Math.round(amt) : amt < 1000 ? Math.round(amt / 5) * 5 : Math.round(amt / 10) * 10;
      if (v >= 1000) return (v / 1000).toLocaleString("ru", { maximumFractionDigits: 2 }) + " " + (u === "г" ? "кг" : "л");
      return v + " " + u;
    }
    var r = up ? Math.max(0.5, Math.ceil(amt * 2 - 1e-9) / 2) : Math.max(0.5, Math.round(amt * 2) / 2);
    return frac(r) + " " + u;
  }
  function hint(k, amt) {
    if (!amt) return "";
    var g = ING[k], u = unitOf(k);
    if (u === "шт") { return g[7] >= 30 ? "≈ " + Math.round(amt * g[7] / 10) * 10 + " г" : ""; }
    if (u === "зуб.") return "";
    var tb = g[8] || (u === "мл" ? 15 : g[1] === "sp" ? 8 : 0);
    if (!tb) return "";
    var t = amt / tb;
    if (t > 4.5) return "";
    if (t >= 0.75) return "≈ " + frac(Math.round(t * 2) / 2) + " ст. л.";
    return "≈ " + frac(Math.max(0.25, Math.round(t * 3 * 4) / 4)) + " ч. л.";
  }

  // ───────── общие куски разметки
  var ICON = {
    home: '<path d="M4 11.5 12 4l8 7.5V20h-5.5v-5.5h-5V20H4z"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    list: '<path d="M6 4h12v16H6z"/><path d="M9 9h6M9 12.5h6M9 16h3.5"/>',
    mark: '<path d="M7 4h10v16l-5-4-5 4z"/>',
    back: '<path d="M15 5 8 12l7 7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    x: '<path d="m6 6 12 12M18 6 6 18"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
    snow: '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/>',
    share: '<path d="M12 15V4M8 7.5 12 4l4 3.5M5 12v7h14v-7"/>',
    trash: '<path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13"/>',
    chev: '<path d="m7 10 5 5 5-5"/>'
  };
  function ico(n, cls) { return '<svg class="ico ' + (cls || "") + '" viewBox="0 0 24 24" aria-hidden="true">' + ICON[n] + "</svg>"; }

  function pic(r, cls) {
    var u = IMG[r.id];
    return '<div class="pic c-' + r.cat + " " + (cls || "") + '"><span class="emo">' + CATS[r.cat][1] + "</span>" +
      (u ? '<img loading="lazy" decoding="async" src="' + esc(u) + '" alt="" onerror="this.remove()">' : "") + "</div>";
  }
  function saveBtn(r, cls) {
    var on = S.saved.indexOf(r.id) >= 0;
    return '<button class="bm ' + (cls || "") + (on ? " on" : "") + '" data-act="save" data-id="' + r.id + '" aria-pressed="' + on +
      '" aria-label="' + (on ? "Убрать из сохранённых" : "Сохранить рецепт") + '">' + ico("mark") + "</button>";
  }
  function meta(r) { return fmtTime(r.time) + " · " + Math.round(r.n.k) + " ккал · Б " + Math.round(r.n.p) + " г"; }
  function card(r, cls) {
    return '<div class="card ' + (cls || "") + '"><a href="#/r/' + r.id + '">' + pic(r) +
      (r.fr ? '<span class="badge">' + ico("snow") + "в морозилку</span>" : "") +
      "<h3>" + esc(r.t) + '</h3><p class="meta">' + meta(r) + "</p></a>" + saveBtn(r) + "</div>";
  }
  function row(title, list, href, sub) {
    if (!list.length) return "";
    return '<section class="sec"><div class="sec-h"><h2>' + esc(title) + "</h2>" +
      (href ? '<a class="more" href="' + href + '">Все ' + list.length + "</a>" : "") + "</div>" +
      (sub ? '<p class="sec-sub">' + esc(sub) + "</p>" : "") +
      '<div class="hscroll">' + list.slice(0, 12).map(function (r) { return card(r, "in-row"); }).join("") + "</div></section>";
  }
  var DAY = Math.floor(Date.now() / 864e5);
  function rot(a) { var n = a.length ? DAY % a.length : 0; return a.slice(n).concat(a.slice(0, n)); }

  // ───────── экран: обзор
  function viewHome() {
    var h = '<header class="top"><p class="brand">Поварёшка</p><h1>Что готовим?</h1></header>' +
      '<a class="searchbar" href="#/s">' + ico("search") + "<span>Блюдо, продукт, кухня…</span></a>";

    var inList = Object.keys(S.list).map(function (id) { return BY[id]; });
    if (inList.length) h += row("В списке покупок", inList, "#/list");

    var tiles = [
      ["Курица", "#/s?cat=chicken", "chicken"], ["Свинина", "#/s?cat=pork", "pork"],
      ["Говядина", "#/s?cat=beef", "beef"], ["Морепродукты", "#/s?cat=seafood", "seafood"],
      ["В морозилку", "#/s?col=freeze", null, "freeze"], ["До 30 минут", "#/s?col=quick", null, "quick"],
      ["Необычный вкус", "#/s?col=unique", null, "unique"], ["Много белка", "#/s?col=protein", null, "protein"]
    ];
    h += '<div class="tiles">' + tiles.map(function (t) {
      var pool = t[2] ? RECIPES.filter(function (r) { return r.cat === t[2]; }) : RECIPES.filter(COL[t[3]].f);
      var r = rot(pool)[0];
      return '<a class="tile" href="' + t[1] + '">' + pic(r, "tile-pic") + "<span>" + t[0] + "</span></a>";
    }).join("") + "</div>";

    var d = RECIPES[(DAY * 13) % RECIPES.length];
    h += '<section class="sec"><a class="hero-card" href="#/r/' + d.id + '">' + pic(d) +
      '<div class="hero-t"><span class="kicker">Блюдо дня</span><h2>' + esc(d.t) + "</h2><p>" + meta(d) + "</p></div></a></section>";

    h += '<section class="sec"><div class="sec-h"><h2>Подборки</h2></div><div class="hscroll snap">' +
      COLS.map(function (c) {
        var rs = rot(RECIPES.filter(c.f));
        if (!rs.length) return "";
        return '<a class="col-card" href="#/s?col=' + c.id + '">' + pic(rs[0]) +
          '<div class="col-t"><h3>' + esc(c.t) + "</h3><p>" + esc(c.d) + '</p><div class="col-f"><span class="stack">' +
          rs.slice(1, 4).map(function (r) { return pic(r, "mini"); }).join("") +
          '</span><span class="btn-ghost">' + rs.length + " " + plural(rs.length, ["рецепт", "рецепта", "рецептов"]) + "</span></div></div></a>";
      }).join("") + "</div></section>";

    var rec = S.recent.map(function (id) { return BY[id]; });
    h += row("Недавно смотрели", rec);
    h += row("Заморозить впрок", rot(RECIPES.filter(COL.freeze.f)), "#/s?col=freeze", "Сварил кастрюлю — разложил по контейнерам");
    h += row("Быстро: до 30 минут", rot(RECIPES.filter(COL.quick.f)), "#/s?col=quick");
    h += row("Необычный вкус", rot(RECIPES.filter(COL.unique.f)), "#/s?col=unique", "Когда хочется чего-то нового");
    ["chicken", "pork", "beef", "seafood", "other"].forEach(function (c) {
      h += row(CATS[c][0], rot(RECIPES.filter(function (r) { return r.cat === c; })), "#/s?cat=" + c);
    });
    h += '<p class="foot">' + RECIPES.length + " рецептов · КБЖУ рассчитаны по сырым продуктам на одну порцию и являются оценкой." +
      (Object.keys(IMG).length ? ' <a href="#/credits">Авторы фотографий</a>' : "") + "</p>";
    app.innerHTML = h;
  }

  // ───────── экран: поиск
  var FILTERS = [
    { k: "col", t: "Раздел", opts: COLS.map(function (c) { return [c.id, c.t]; }) },
    { k: "cat", t: "Основа", multi: 1, opts: Object.keys(CATS).map(function (c) { return [c, CATS[c][0]]; }) },
    { k: "type", t: "Тип блюда", multi: 1, opts: Object.keys(TYPES).map(function (c) { return [c, TYPES[c]]; }) },
    { k: "time", t: "Время", opts: [["15", "до 15 минут"], ["30", "до 30 минут"], ["45", "до 45 минут"], ["60", "до 1 часа"], ["120", "до 2 часов"]] },
    { k: "prot", t: "Белок на порцию", opts: [["20", "от 20 г"], ["30", "от 30 г"], ["40", "от 40 г"], ["50", "от 50 г"]] },
    { k: "kcal", t: "Калории на порцию", opts: [["400", "до 400 ккал"], ["500", "до 500 ккал"], ["600", "до 600 ккал"], ["800", "до 800 ккал"]] },
    { k: "cu", t: "Кухня", multi: 1, opts: Object.keys(CUIS).map(function (c) { return [c, CUIS[c]]; }) },
    { k: "lvl", t: "Сложность", opts: [["1", "Просто"], ["2", "Средне"], ["3", "Сложно"]] },
    { k: "sort", t: "Сортировка", opts: [["time", "Сначала быстрые"], ["prot", "Больше белка"], ["kcal", "Меньше калорий"], ["az", "По алфавиту"]] }
  ];
  var F = {};
  function readFilters(q) {
    F = { q: "" };
    FILTERS.forEach(function (f) { F[f.k] = f.multi ? [] : ""; });
    (q || "").split("&").forEach(function (p) {
      var i = p.indexOf("="); if (i < 0) return;
      var k = p.slice(0, i), v = decodeURIComponent(p.slice(i + 1));
      if (k === "q") F.q = v;
      else if (k in F) F[k] = Array.isArray(F[k]) ? v.split(",").filter(Boolean) : v;
    });
  }
  function filterHash() {
    var p = [];
    if (F.q) p.push("q=" + encodeURIComponent(F.q));
    FILTERS.forEach(function (f) { var v = F[f.k]; if (f.multi ? v.length : v) p.push(f.k + "=" + (f.multi ? v.join(",") : v)); });
    return "#/s" + (p.length ? "?" + p.join("&") : "");
  }
  function syncHash() {
    var h = filterHash();
    stack[stack.length - 1] = h;
    history.replaceState(null, "", h);
  }
  function runSearch() {
    var words = norm(F.q).split(/\s+/).filter(Boolean);
    var res = RECIPES.filter(function (r) {
      if (F.col && COL[F.col] && !COL[F.col].f(r)) return false;
      if (F.cat.length && F.cat.indexOf(r.cat) < 0) return false;
      if (F.type.length && F.type.indexOf(r.type) < 0) return false;
      if (F.cu.length && F.cu.indexOf(r.cu) < 0) return false;
      if (F.time && r.time > +F.time) return false;
      if (F.prot && r.n.p < +F.prot) return false;
      if (F.kcal && r.n.k > +F.kcal) return false;
      if (F.lvl && r.lvl !== +F.lvl) return false;
      for (var i = 0; i < words.length; i++) if (r.hay.indexOf(words[i]) < 0) return false;
      return true;
    });
    if (F.sort === "time") res.sort(function (a, b) { return a.time - b.time; });
    else if (F.sort === "prot") res.sort(function (a, b) { return b.n.p - a.n.p; });
    else if (F.sort === "kcal") res.sort(function (a, b) { return a.n.k - b.n.k; });
    else if (F.sort === "az") res.sort(function (a, b) { return a.t.localeCompare(b.t, "ru"); });
    return res;
  }
  function chipsHtml() {
    var any = false;
    var h = FILTERS.map(function (f) {
      var v = F[f.k], on = f.multi ? v.length : !!v, label = f.t;
      if (on) {
        any = true;
        var first = f.multi ? v[0] : v, o = f.opts.filter(function (x) { return x[0] === first; })[0];
        label = (o ? o[1] : f.t) + (f.multi && v.length > 1 ? " +" + (v.length - 1) : "");
      }
      return '<button class="chip' + (on ? " on" : "") + '" data-act="filter" data-k="' + f.k + '">' + esc(label) + ico("chev") + "</button>";
    }).join("");
    if (any) h = '<button class="chip reset" data-act="reset">' + ico("x") + "Сбросить</button>" + h;
    return h;
  }
  function resultsHtml() {
    var res = runSearch();
    var head = F.col && COL[F.col] ? '<div class="col-head"><h2>' + esc(COL[F.col].t) + "</h2><p>" + esc(COL[F.col].d) + "</p></div>" : "";
    if (!res.length) return head + '<div class="empty"><p class="emo-big">🔎</p><p>Ничего не нашлось.</p><p class="muted">Попробуйте убрать часть фильтров или изменить запрос.</p></div>';
    return head + '<p class="count">' + res.length + " " + plural(res.length, ["рецепт", "рецепта", "рецептов"]) + '</p><div class="grid">' + res.map(function (r) { return card(r); }).join("") + "</div>";
  }
  function viewSearch(q) {
    readFilters(q);
    app.innerHTML = '<header class="top"><h1>Поиск</h1></header>' +
      '<label class="searchbar input">' + ico("search") + '<input id="q" type="search" enterkeyhint="search" autocomplete="off" placeholder="Блюдо, продукт, кухня…" value="' + esc(F.q) + '"></label>' +
      '<div class="chips" id="chips">' + chipsHtml() + '</div><div id="results">' + resultsHtml() + "</div>";
  }
  function refreshSearch() { $("#chips").innerHTML = chipsHtml(); $("#results").innerHTML = resultsHtml(); syncHash(); }

  function openSheet(k) {
    var f = FILTERS.filter(function (x) { return x.k === k; })[0];
    var v = F[k];
    var opts = f.opts;
    if (k === "cu") opts = opts.filter(function (o) { return RECIPES.some(function (r) { return r.cu === o[0]; }); });
    sheetEl.innerHTML = '<div class="sheet-bg" data-act="sheet-close"></div><div class="sheet-box" role="dialog" aria-label="' + esc(f.t) + '"><div class="sheet-h"><h2>' + esc(f.t) +
      '</h2><button class="icon-btn" data-act="sheet-close" aria-label="Закрыть">' + ico("x") + '</button></div><div class="opts">' +
      opts.map(function (o) {
        var on = f.multi ? v.indexOf(o[0]) >= 0 : v === o[0];
        return '<button class="opt' + (on ? " on" : "") + '" data-act="opt" data-k="' + k + '" data-v="' + o[0] + '">' + esc(o[1]) + "</button>";
      }).join("") + '</div><button class="btn wide" data-act="sheet-close">Показать</button></div>';
    sheetEl.hidden = false;
    document.body.classList.add("locked");
  }
  function closeSheet() { sheetEl.hidden = true; sheetEl.innerHTML = ""; document.body.classList.remove("locked"); }

  // ───────── экран: рецепт
  function ingHtml(r) {
    var s = servOf(r), mult = s / r.serv;
    return r.items.map(function (it) {
      if (it.h) return '<li class="ing-h">' + esc(it.h) + "</li>";
      var amt = it.a * mult, q = fmtQty(it.k, amt), hn = hint(it.k, amt);
      return '<li class="ing" data-act="strike"><span class="q">' + (q || "по вкусу") + '</span><span class="n">' + esc(ING[it.k][0]) +
        (it.note ? ", " + esc(it.note) : "") + (hn ? ' <small>' + hn + "</small>" : "") + "</span></li>";
    }).join("");
  }
  function creditLine(r) {
    var c = CREDITS[r.id];
    if (!c || !IMG[r.id]) return "";
    return '<p class="credit">Фото: <a href="' + esc(c[3]) + '" target="_blank" rel="noopener">' + esc(c[0] || "Wikimedia Commons") + "</a>" + (c[1] ? ", " + esc(c[1]) : "") + "</p>";
  }
  function listBtnHtml(r) {
    var inL = !!S.list[r.id];
    return '<button class="btn wide' + (inL ? " done" : "") + '" data-act="tolist" data-id="' + r.id + '">' + ico(inL ? "x" : "list") +
      (inL ? "Убрать из списка покупок" : "Добавить продукты в список") + "</button>";
  }
  function viewRecipe(id) {
    var r = BY[id];
    if (!r) { app.innerHTML = '<div class="empty"><p>Рецепт не найден.</p><a class="btn" href="#/">На главную</a></div>'; return; }
    S.recent = [id].concat(S.recent.filter(function (x) { return x !== id; })).slice(0, 12); persist();
    var n = r.n, pk = n.p * 4, fk = n.f * 9, ck = n.c * 4, tot = pk + fk + ck || 1;
    var chips = [ico("clock") + fmtTime(r.time), LVL[r.lvl], CUIS[r.cu], TYPES[r.type]];
    if (r.fr) chips.push(ico("snow") + "Можно заморозить");
    if (r.tags.spicy) chips.push("Острое");
    var h = '<article class="recipe"><div class="r-hero">' + pic(r, "hero") +
      '<button class="round back" data-act="back" aria-label="Назад">' + ico("back") + "</button>" + saveBtn(r, "round") + "</div>" +
      '<div class="r-body">' + creditLine(r) + '<h1>' + esc(r.t) + '</h1><p class="lead">' + esc(r.d) + '</p><div class="tags">' +
      chips.map(function (c) { return "<span>" + c + "</span>"; }).join("") + "</div>" +

      '<section class="kbju" aria-label="Пищевая ценность на порцию"><div class="kbju-row">' +
      '<div><b>' + Math.round(n.k) + '</b><span>ккал</span></div><div><b>' + Math.round(n.p) + '</b><span>белки, г</span></div>' +
      '<div><b>' + Math.round(n.f) + '</b><span>жиры, г</span></div><div><b>' + Math.round(n.c) + '</b><span>углеводы, г</span></div></div>' +
      '<div class="bar" aria-hidden="true"><i class="bp" style="width:' + (pk / tot * 100).toFixed(1) + '%"></i><i class="bf" style="width:' + (fk / tot * 100).toFixed(1) +
      '%"></i><i class="bc" style="width:' + (ck / tot * 100).toFixed(1) + '%"></i></div>' +
      '<p class="note">На 1 порцию. Расчёт по сырым продуктам, оценка ±10–15%.</p></section>' +

      '<section class="block"><div class="block-h"><h2>Продукты</h2><div class="stepper" role="group" aria-label="Количество порций">' +
      '<button data-act="serv" data-d="-1" data-id="' + r.id + '" aria-label="Меньше порций">' + ico("minus") + '</button><span id="servN"></span>' +
      '<button data-act="serv" data-d="1" data-id="' + r.id + '" aria-label="Больше порций">' + ico("plus") + "</button></div></div>" +
      '<ul class="ings" id="ings"></ul><div id="listBtn"></div></section>' +

      '<section class="block"><div class="block-h"><h2>Приготовление</h2>' +
      ("wakeLock" in navigator ? '<button class="chip' + (wake ? " on" : "") + '" data-act="wake">Не гасить экран</button>' : "") + "</div>" +
      '<p class="step-note" id="stepNote" hidden></p><ol class="steps">' + r.steps.map(function (s) { return '<li data-act="strike"><p>' + esc(s) + "</p></li>"; }).join("") + "</ol></section>" +

      (r.fr ? '<section class="callout ice"><h3>' + ico("snow") + "Как заморозить</h3><p>" + esc(r.fr) + "</p></section>" : "") +
      (r.tip ? '<section class="callout"><h3>Совет</h3><p>' + esc(r.tip) + "</p></section>" : "");

    var sim = RECIPES.filter(function (x) { return x.id !== r.id && (x.cat === r.cat || x.cu === r.cu); })
      .sort(function (a, b) { return ((b.cat === r.cat) + (b.cu === r.cu)) - ((a.cat === r.cat) + (a.cu === r.cu)); }).slice(0, 8);
    h += "</div></article>" + row("Похожие рецепты", sim);
    app.innerHTML = h;
    refreshRecipe(r);
  }
  function refreshRecipe(r) {
    var s = servOf(r);
    $("#servN").textContent = s + " " + plural(s, ["порция", "порции", "порций"]);
    $("#ings").innerHTML = ingHtml(r);
    $("#listBtn").innerHTML = listBtnHtml(r);
    var sn = $("#stepNote");
    sn.hidden = s === r.serv;
    sn.textContent = "Количества и время в тексте шагов указаны для исходных " + r.serv + " " + plural(r.serv, ["порции", "порций", "порций"]) + " — пересчитанные граммы смотрите в списке продуктов выше.";
  }

  // ───────── экран: список покупок
  function buildList() {
    var m = {};
    Object.keys(S.list).forEach(function (id) {
      var r = BY[id], mult = S.list[id] / r.serv;
      r.items.forEach(function (it) {
        if (it.h || ING[it.k][1] === "-") return;
        var e = m[it.k] || (m[it.k] = { k: it.k, a: 0, from: [] });
        e.a += it.a * mult;
        if (e.from.indexOf(r.t) < 0) e.from.push(r.t);
      });
    });
    return AISLES.map(function (a) {
      var items = Object.keys(m).filter(function (k) { return ING[k][1] === a[0]; }).map(function (k) { return m[k]; })
        .sort(function (x, y) { return ING[x.k][0].localeCompare(ING[y.k][0], "ru"); });
      return { t: a[1], items: items };
    }).filter(function (g) { return g.items.length; });
  }
  function listText() {
    var out = ["Список покупок"], groups = buildList();
    groups.forEach(function (g) {
      out.push("", g.t.toUpperCase());
      g.items.forEach(function (e) { var q = fmtQty(e.k, e.a, true); out.push((S.checked[e.k] ? "✓ " : "• ") + ING[e.k][0] + (q ? " — " + q : "")); });
    });
    if (S.extra.length) { out.push("", "ДОПОЛНИТЕЛЬНО"); S.extra.forEach(function (x) { out.push((x.d ? "✓ " : "• ") + x.t); }); }
    return out.join("\n");
  }
  function viewList() {
    var ids = Object.keys(S.list), h = '<header class="top"><h1>Список покупок</h1></header>';
    if (!ids.length && !S.extra.length) {
      app.innerHTML = h + '<div class="empty"><p class="emo-big">🛒</p><p>Список пока пуст.</p><p class="muted">Откройте рецепт, выберите число порций и нажмите «Добавить продукты в список» — одинаковые продукты из разных рецептов сложатся.</p><a class="btn" href="#/s">Выбрать рецепты</a></div>';
      return;
    }
    var groups = buildList(), total = 0, done = 0;
    groups.forEach(function (g) { g.items.forEach(function (e) { total++; if (S.checked[e.k]) done++; }); });
    S.extra.forEach(function (x) { total++; if (x.d) done++; });

    h += '<div class="list-actions"><button class="chip" data-act="share">' + ico("share") + 'Поделиться</button><button class="chip" data-act="uncheck">Снять отметки</button><button class="chip" data-act="clear">' + ico("trash") + "Очистить</button></div>";
    if (ids.length) {
      h += '<section class="sec"><div class="sec-h"><h2>' + ids.length + " " + plural(ids.length, ["рецепт", "рецепта", "рецептов"]) + '</h2></div><ul class="lrecipes">' +
        ids.map(function (id) {
          var r = BY[id], s = S.list[id];
          return '<li><a href="#/r/' + id + '">' + pic(r, "mini") + "<span>" + esc(r.t) + '</span></a><div class="stepper sm" role="group" aria-label="Порции">' +
            '<button data-act="lserv" data-d="-1" data-id="' + id + '" aria-label="Меньше порций">' + ico("minus") + "</button><span>" + s + '</span>' +
            '<button data-act="lserv" data-d="1" data-id="' + id + '" aria-label="Больше порций">' + ico("plus") + '</button></div>' +
            '<button class="icon-btn" data-act="lremove" data-id="' + id + '" aria-label="Убрать рецепт из списка">' + ico("x") + "</button></li>";
        }).join("") + "</ul></section>";
    }
    h += '<div class="progress"><div><i style="width:' + (total ? done / total * 100 : 0) + '%"></i></div><span>Куплено ' + done + " из " + total + "</span></div>";
    groups.forEach(function (g) {
      h += '<section class="aisle"><h2>' + esc(g.t) + "</h2><ul>" + g.items.map(function (e) {
        var q = fmtQty(e.k, e.a, true), on = !!S.checked[e.k];
        return '<li><label class="item' + (on ? " on" : "") + '"><span class="it"><b>' + (q || "") + "</b> " + esc(ING[e.k][0]) +
          '<small>' + esc(e.from.join(" · ")) + '</small></span><input type="checkbox" data-act="check" data-k="' + e.k + '"' + (on ? " checked" : "") + "></label></li>";
      }).join("") + "</ul></section>";
    });
    h += '<section class="aisle"><h2>Дополнительно</h2><ul>' + S.extra.map(function (x, i) {
      return '<li><label class="item' + (x.d ? " on" : "") + '"><span class="it">' + esc(x.t) + '</span><input type="checkbox" data-act="xcheck" data-i="' + i + '"' + (x.d ? " checked" : "") + '></label>' +
        '<button class="icon-btn" data-act="xdel" data-i="' + i + '" aria-label="Удалить">' + ico("x") + "</button></li>";
    }).join("") + '</ul><form class="addrow" id="addForm"><input id="addInput" type="text" maxlength="60" placeholder="Добавить своё: хлеб, кофе…" autocomplete="off"><button class="btn" type="submit" aria-label="Добавить">' + ico("plus") + "</button></form></section>";
    app.innerHTML = h;
  }

  // ───────── экран: сохранённое
  function viewSaved() {
    var rs = S.saved.map(function (id) { return BY[id]; });
    var h = '<header class="top"><h1>Сохранённое</h1></header>';
    if (!rs.length) h += '<div class="empty"><p class="emo-big">🔖</p><p>Здесь будут ваши рецепты.</p><p class="muted">Нажмите на закладку на карточке или на странице рецепта.</p><a class="btn" href="#/s">Искать рецепты</a></div>';
    else h += '<p class="count">' + rs.length + " " + plural(rs.length, ["рецепт", "рецепта", "рецептов"]) + '</p><div class="grid">' + rs.map(function (r) { return card(r); }).join("") + "</div>";
    app.innerHTML = h;
  }

  // ───────── экран: авторы фото
  function viewCredits() {
    var rows = RECIPES.filter(function (r) { return CREDITS[r.id] && IMG[r.id]; });
    app.innerHTML = '<header class="top"><h1>Авторы фотографий</h1></header><div class="credits"><p class="muted">Фотографии взяты с Wikimedia Commons и используются по свободным лицензиям. ' +
      'Изображения уменьшены и обрезаны под формат карточек. Фото иллюстрирует блюдо в целом и может отличаться от результата по рецепту.</p><ul>' +
      rows.map(function (r) {
        var c = CREDITS[r.id];
        return '<li><a href="#/r/' + r.id + '">' + esc(r.t) + '</a><span>' + esc(c[0] || "автор не указан") + " · " +
          (c[2] ? '<a href="' + esc(c[2]) + '" target="_blank" rel="noopener">' + esc(c[1]) + "</a>" : esc(c[1] || "")) +
          ' · <a href="' + esc(c[3]) + '" target="_blank" rel="noopener">источник</a></span></li>';
      }).join("") + '</ul><a class="btn" href="#/">На главную</a></div>';
  }

  // ───────── навигация
  var stack = [], pos = {}, cur = "";
  function tabs(active) {
    var n = listCount();
    var t = [["home", "#/", "home", "Обзор"], ["search", "#/s", "search", "Поиск"], ["list", "#/list", "list", "Покупки"], ["saved", "#/saved", "mark", "Сохранённое"]];
    tabsEl.innerHTML = t.map(function (x) {
      return '<a class="tab' + (x[0] === active ? " on" : "") + '" href="' + x[1] + '"' + (x[0] === active ? ' aria-current="page"' : "") + ">" + ico(x[2]) +
        (x[0] === "list" && n ? '<i class="dot">' + n + "</i>" : "") + "<span>" + x[3] + "</span></a>";
    }).join("");
  }
  function route() {
    var h = location.hash || "#/";
    var back = stack.length > 1 && stack[stack.length - 2] === h;
    if (cur) pos[cur] = window.scrollY;
    if (back) stack.pop(); else if (stack[stack.length - 1] !== h) stack.push(h);
    cur = h;
    closeSheet();
    var active = "home", m;
    if ((m = /^#\/r\/([\w-]+)/.exec(h))) { viewRecipe(m[1]); active = ""; }
    else if (/^#\/s(\?|$)/.test(h)) { viewSearch(h.split("?")[1]); active = "search"; }
    else if (h === "#/list") { viewList(); active = "list"; }
    else if (h === "#/saved") { viewSaved(); active = "saved"; }
    else if (h === "#/credits") { viewCredits(); active = ""; }
    else viewHome();
    tabs(active);
    window.scrollTo(0, back ? pos[h] || 0 : 0);
  }
  function rerender() { var y = window.scrollY; var h = cur; if (h === "#/list") viewList(); else if (h === "#/saved") viewSaved(); else if (h === "#/" || h === "") viewHome(); tabs(h === "#/list" ? "list" : h === "#/saved" ? "saved" : "home"); window.scrollTo(0, y); }

  // ───────── действия
  var wake = null;
  function toggleWake(btn) {
    if (wake) { wake.release(); wake = null; btn.classList.remove("on"); return; }
    navigator.wakeLock.request("screen").then(function (w) { wake = w; btn.classList.add("on"); toast("Экран не погаснет, пока открыт рецепт"); w.addEventListener("release", function () { wake = null; var b = $('[data-act="wake"]'); if (b) b.classList.remove("on"); }); })
      .catch(function () { toast("Не получилось включить"); });
  }
  function setServ(r, s) {
    s = Math.max(1, Math.min(24, s));
    if (S.list[r.id]) { S.list[r.id] = s; persist(); } else servMem[r.id] = s;
  }

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-act]");
    if (!el) return;
    var act = el.dataset.act, id = el.dataset.id, r = id && BY[id];
    if (act === "check" || act === "xcheck") return; // обрабатывается в change
    if (act === "save") {
      e.preventDefault();
      var i = S.saved.indexOf(id);
      if (i >= 0) S.saved.splice(i, 1); else S.saved.unshift(id);
      persist();
      var on = i < 0;
      document.querySelectorAll('.bm[data-id="' + id + '"]').forEach(function (b) { b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
      toast(on ? "Рецепт сохранён" : "Убрано из сохранённых");
      if (cur === "#/saved") viewSaved();
    } else if (act === "back") {
      if (stack.length > 1) history.back(); else location.hash = "#/";
    } else if (act === "serv") {
      setServ(r, servOf(r) + +el.dataset.d); refreshRecipe(r); tabs("");
    } else if (act === "tolist") {
      if (S.list[id]) { servMem[id] = S.list[id]; delete S.list[id]; toast("Убрано из списка покупок"); }
      else { S.list[id] = servOf(r); toast("Продукты добавлены в список"); }
      if (!listCount()) S.checked = {};
      persist(); refreshRecipe(r); tabs("");
    } else if (act === "strike") {
      el.classList.toggle("struck");
    } else if (act === "wake") {
      toggleWake(el);
    } else if (act === "filter") {
      openSheet(el.dataset.k);
    } else if (act === "opt") {
      var k = el.dataset.k, v = el.dataset.v, f = FILTERS.filter(function (x) { return x.k === k; })[0];
      if (f.multi) { var j = F[k].indexOf(v); if (j >= 0) F[k].splice(j, 1); else F[k].push(v); el.classList.toggle("on"); refreshSearch(); }
      else { F[k] = F[k] === v ? "" : v; refreshSearch(); closeSheet(); }
    } else if (act === "sheet-close") {
      closeSheet();
    } else if (act === "reset") {
      readFilters(""); $("#q").value = ""; refreshSearch();
    } else if (act === "lserv") {
      S.list[id] = Math.max(1, Math.min(24, S.list[id] + +el.dataset.d)); persist(); rerender();
    } else if (act === "lremove") {
      delete S.list[id]; if (!listCount()) S.checked = {}; persist(); rerender();
    } else if (act === "xdel") {
      S.extra.splice(+el.dataset.i, 1); persist(); rerender();
    } else if (act === "uncheck") {
      S.checked = {}; S.extra.forEach(function (x) { x.d = 0; }); persist(); rerender();
    } else if (act === "clear") {
      if (confirm("Очистить весь список покупок?")) { S.list = {}; S.checked = {}; S.extra = []; persist(); rerender(); }
    } else if (act === "share") {
      var text = listText();
      if (navigator.share) navigator.share({ title: "Список покупок", text: text }).catch(function () { });
      else if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast("Список скопирован"); }, function () { toast("Не удалось скопировать"); });
      else toast("Браузер не поддерживает копирование");
    }
  });
  document.addEventListener("change", function (e) {
    var el = e.target, act = el.dataset && el.dataset.act;
    if (act === "check") { if (el.checked) S.checked[el.dataset.k] = 1; else delete S.checked[el.dataset.k]; persist(); rerender(); }
    else if (act === "xcheck") { S.extra[+el.dataset.i].d = el.checked ? 1 : 0; persist(); rerender(); }
  });
  var qTimer;
  document.addEventListener("input", function (e) {
    if (e.target.id !== "q") return;
    F.q = e.target.value.trim();
    clearTimeout(qTimer); qTimer = setTimeout(function () { $("#results").innerHTML = resultsHtml(); syncHash(); }, 120);
  });
  document.addEventListener("submit", function (e) {
    if (e.target.id !== "addForm") return;
    e.preventDefault();
    var v = $("#addInput").value.trim();
    if (!v) return;
    S.extra.push({ t: v, d: 0 }); persist(); rerender();
    var inp = $("#addInput"); if (inp) inp.focus();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !sheetEl.hidden) closeSheet();
    if (e.key === "Enter" && e.target.id === "q") e.target.blur();
  });
  window.addEventListener("hashchange", route);
  route();
})();
