(function () {
  "use strict";

  var B = window.BANK;
  var app = document.getElementById("app");
  var LEVELS = ["B1", "B2", "C1", "C2"];
  var SET_SIZE = 10;

  var SECTIONS = {
    gramatyka:  { title: "Gramatyka",  subtitle: "Poprawność gramatyczna", icon: "grammar" },
    slownictwo: { title: "Słownictwo", subtitle: "Frazeologizmy, synonimy, antonimy, spójniki", icon: "words" },
    czytanie:   { title: "Czytanie",   subtitle: "Rozumienie tekstów pisanych", icon: "book" },
    pisanie:    { title: "Pisanie",    subtitle: "Wypowiedzi pisemne", icon: "pen" }
  };

  // ---------- Icons (Material Symbols, Apache 2.0) ----------
  var ICONS = {
    book: '<svg viewBox="0 0 24 24"><path d="M2 6.5C3.8 5.5 6 5 8 5s3.4.5 4 1v13c-.9-.6-2.3-1-4-1s-4 .4-6 1.4z"/><path d="M13 6c.5-.4 1.3-.7 2.2-.9V14l1.6-1.3 1.6 1.3V4.7c1.3.2 2.5.6 3.6 1.3v13.4c-2-1-4.3-1.4-6-1.4s-2.9.4-3 1z"/></svg>',
    grammar: '<svg viewBox="0 0 24 24"><path d="M21 5c-1.1-.35-2.3-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/><path d="M14 9h5v1.5h-5zM14 11.5h5V13h-5zM14 14h5v1.5h-5z"/></svg>',
    pen: '<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>',
    words: '<svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM7 9h10v2H7zm6 5H7v-2h6zm4-6H7V6h10z"/></svg>',
    verified: '<svg viewBox="0 0 24 24"><path d="M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82L8.6 22.5l3.4-1.47 3.4 1.46 1.89-3.19 3.61-.82-.34-3.69L23 12zm-12.91 4.72l-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.35z"/></svg>',
    shuffle: '<svg viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    chev: '<svg class="chev" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>'
  };

  // ---------- Helpers ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  // **pogrubienie**, [[podkreślenie]], \n
  function rich(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\[\[(.+?)\]\]/g, "<u>$1</u>").replace(/\n/g, "<br>");
  }
  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, val);
    } catch (e) { return null; }
  }
  var toastTimer;
  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }
  function norm(s) {
    return String(s).toLowerCase().replace(/[–—]/g, "-").replace(/[.,!?;:«»„”"()]/g, " ").replace(/\s+/g, " ").trim();
  }
  function plain(s) {
    return norm(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l");
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function plural(n, one, few, many) {
    if (n === 1) return one;
    var d = n % 10, h = n % 100;
    return d >= 2 && d <= 4 && (h < 12 || h > 14) ? few : many;
  }
  function parseItem(raw) {
    var a = raw[1];
    if (a.charAt(0) === "=") return { q: raw[0], type: "input", answers: a.slice(1).split("|"), expl: raw[2] || "" };
    var opts = a.split("|"), correct = null;
    opts = opts.map(function (o) { if (o.charAt(0) === "*") { correct = o.slice(1); return correct; } return o; });
    return { q: raw[0], type: "choice", options: opts, answer: correct, expl: raw[2] || "" };
  }
  function topicsFor(level, section) {
    return B.topics.filter(function (t) { return t.level === level && t.section === section; });
  }
  function countFor(level, section) {
    if (section === "czytanie") return B.reading.filter(function (r) { return r.level === level; }).reduce(function (s, r) { return s + r.items.length; }, 0);
    if (section === "pisanie") return B.writing.filter(function (w) { return w.level === level; }).length;
    return topicsFor(level, section).reduce(function (s, t) { return s + t.items.length; }, 0);
  }
  function best(key) { var v = store("best:" + key); return v === null ? null : +v; }
  function ring(pct) {
    var c = 2 * Math.PI * 14;
    return '<svg class="ring" viewBox="0 0 34 34"><circle class="bg" cx="17" cy="17" r="14"/><circle class="fg" cx="17" cy="17" r="14" ' +
      'stroke-dasharray="' + c + '" stroke-dashoffset="' + c * (1 - pct) + '" transform="rotate(-90 17 17)"/></svg>';
  }
  function head(backTo, title, sub, level) {
    return '<header class="page-head"><button class="back" data-go="' + backTo + '" aria-label="Wstecz">' + ICONS.back +
      '</button><div><h1 class="page-title">' + esc(title) + '</h1><div class="page-sub">' +
      (level ? '<span class="lvl">' + level + "</span>" : "") + esc(sub) + "</div></div></header>";
  }
  function row(go, icon, title, desc, meta, trailing) {
    return '<button class="row" data-go="' + go + '"><div class="row-icon' + (icon.length < 4 ? " num" : "") + '">' + (ICONS[icon] || esc(icon)) +
      '</div><div class="row-body"><div class="row-title">' + esc(title) + "</div>" +
      (desc ? '<div class="row-desc">' + esc(desc) + "</div>" : "") + (meta ? '<div class="meta">' + meta + "</div>" : "") +
      "</div>" + (trailing || ICONS.chev) + "</button>";
  }
  function bindGo() {
    app.querySelectorAll("[data-go]").forEach(function (b) {
      b.onclick = function () { go(b.dataset.go); };
    });
  }
  function render(html) {
    app.innerHTML = '<div class="view">' + html + "</div>";
    bindGo();
  }

  // ---------- Router ----------
  function go(path) { location.hash = "#/" + path; }
  function route() {
    var p = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
    window.scrollTo(0, 0);
    if (!p.length) return renderHome();
    var level = p[0], section = p[1];
    if (LEVELS.indexOf(level) === -1 || !SECTIONS[section]) return go("");
    store("level", level);
    if (p.length === 2) return renderSection(level, section);
    if (section === "czytanie") {
      var r = B.reading.filter(function (x) { return x.id === p[2]; })[0];
      return r ? renderPractice(level, section, { title: r.title, sub: "Czytanie", items: r.items, passage: r, key: "r:" + r.id, back: level + "/czytanie" }) : go(level + "/czytanie");
    }
    if (section === "pisanie") {
      var w = B.writing.filter(function (x) { return x.id === p[2]; })[0];
      return w ? renderWriting(level, w) : go(level + "/pisanie");
    }
    if (p[2] === "mix") return renderMix(level, section);
    var t = B.topics.filter(function (x) { return x.id === p[2]; })[0];
    if (!t) return go(level + "/" + section);
    if (p.length === 3) return renderTopic(level, section, t);
    var n = +p[3], from = (n - 1) * SET_SIZE, items = t.items.slice(from, from + SET_SIZE);
    if (!items.length) return go(level + "/" + section + "/" + t.id);
    var total = Math.ceil(t.items.length / SET_SIZE);
    renderPractice(level, section, {
      title: t.title, sub: "Zestaw " + n + " z " + total, instruction: t.instruction, items: items,
      key: t.id + ":" + n, back: level + "/" + section + "/" + t.id, idPrefix: t.id + "-", idOffset: from,
      next: n < total ? level + "/" + section + "/" + t.id + "/" + (n + 1) : null
    });
  }
  window.addEventListener("hashchange", route);

  // ---------- Home ----------
  function renderHome() {
    var level = store("level");
    if (LEVELS.indexOf(level) === -1) level = "B1";
    var all = 0;
    LEVELS.forEach(function (l) { Object.keys(SECTIONS).forEach(function (s) { all += countFor(l, s); }); });
    var idx = LEVELS.indexOf(level);
    var html = '<header class="hero"><h1>Polski B1–C2</h1><p>' + all + " " + plural(all, "ćwiczenie", "ćwiczenia", "ćwiczeń") +
      " w formacie egzaminu certyfikatowego</p></header>" +
      '<div class="levels" role="group" aria-label="Poziom"><span class="pill" style="transform:translateX(' + idx * 100 + '%)"></span>' +
      LEVELS.map(function (l) { return '<button data-level="' + l + '" aria-pressed="' + (l === level) + '">' + l + "</button>"; }).join("") +
      '</div><div class="label">' + ICONS.verified + 'Działy</div><div class="list stagger">' +
      Object.keys(SECTIONS).map(function (k) {
        var m = SECTIONS[k], n = countFor(level, k);
        var unit = k === "pisanie" ? plural(n, "temat", "tematy", "tematów") : plural(n, "ćwiczenie", "ćwiczenia", "ćwiczeń");
        return row(level + "/" + k, m.icon, m.title, m.subtitle, '<span class="pts">' + n + " " + unit + "</span>");
      }).join("") + '</div><p class="foot">Poziom zapamiętuje się automatycznie.</p>';
    render(html);
    app.querySelectorAll("[data-level]").forEach(function (b) {
      b.onclick = function () {
        if (b.dataset.level === level) return;
        store("level", b.dataset.level);
        var pill = app.querySelector(".pill");
        pill.style.transform = "translateX(" + LEVELS.indexOf(b.dataset.level) * 100 + "%)";
        app.querySelectorAll("[data-level]").forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
        setTimeout(renderHome, 220);
      };
    });
  }

  // ---------- Section ----------
  function renderSection(level, section) {
    var m = SECTIONS[section], html = head("", m.title, m.subtitle, level);
    if (section === "czytanie") {
      var rs = B.reading.filter(function (r) { return r.level === level; });
      html += '<div class="list stagger">' + rs.map(function (r, i) {
        var b = best("r:" + r.id);
        return row(level + "/czytanie/" + r.id, String(i + 1), r.title, null,
          '<span class="pts">' + r.items.length + " " + plural(r.items.length, "pytanie", "pytania", "pytań") + "</span>" +
          (b !== null ? '<span class="pts done">' + b + "%</span>" : ""));
      }).join("") + "</div>";
    } else if (section === "pisanie") {
      var ws = B.writing.filter(function (w) { return w.level === level; });
      html += '<div class="list stagger">' + ws.map(function (w, i) {
        return row(level + "/pisanie/" + w.id, String(i + 1), w.title, w.form, '<span class="pts">' + w.min + "–" + w.max + " słów</span>");
      }).join("") + "</div>";
    } else {
      var ts = topicsFor(level, section);
      html += '<button class="mix" data-go="' + level + "/" + section + '/mix"><div class="mix-icon">' + ICONS.shuffle +
        '</div><div style="flex:1"><div class="mix-title">Losowy zestaw</div><div class="mix-sub">' + SET_SIZE +
        " ćwiczeń ze wszystkich tematów poziomu " + level + "</div></div>" + ICONS.chev + "</button>" +
        '<div class="label">' + ICONS.verified + 'Tematy</div><div class="list stagger">' + ts.map(function (t) {
          var sets = Math.ceil(t.items.length / SET_SIZE), done = 0;
          for (var i = 1; i <= sets; i++) if (best(t.id + ":" + i) !== null) done++;
          return row(level + "/" + section + "/" + t.id, ICONS[m.icon] ? m.icon : "grammar", t.title, null,
            '<span class="pts">' + t.items.length + " " + plural(t.items.length, "ćwiczenie", "ćwiczenia", "ćwiczeń") + "</span>",
            ring(done / sets));
        }).join("") + "</div>";
    }
    if (html.indexOf('class="row"') === -1 && html.indexOf("mix") === -1) html += '<p class="empty">Brak materiałów dla tego poziomu.</p>';
    render(html);
  }

  // ---------- Topic (sets) ----------
  function renderTopic(level, section, t) {
    var sets = Math.ceil(t.items.length / SET_SIZE), html = head(level + "/" + section, t.title, SECTIONS[section].title, level);
    html += '<div class="list stagger">';
    for (var i = 1; i <= sets; i++) {
      var b = best(t.id + ":" + i), n = Math.min(SET_SIZE, t.items.length - (i - 1) * SET_SIZE);
      html += row(level + "/" + section + "/" + t.id + "/" + i, String(i), "Zestaw " + i, null,
        '<span class="pts">' + n + " " + plural(n, "ćwiczenie", "ćwiczenia", "ćwiczeń") + "</span>" +
        (b !== null ? '<span class="pts done">najlepszy wynik: ' + b + "%</span>" : ""));
    }
    render(html + "</div>");
  }

  // ---------- Mix ----------
  function renderMix(level, section) {
    var pool = [];
    topicsFor(level, section).forEach(function (t) {
      t.items.forEach(function (it, i) { pool.push({ raw: it, id: t.id + "-" + (i + 1), instruction: t.instruction, topic: t.title }); });
    });
    renderPractice(level, section, { title: "Losowy zestaw", sub: SECTIONS[section].title, mixed: shuffle(pool).slice(0, SET_SIZE), key: null, back: level + "/" + section, again: true });
  }

  // ---------- Practice ----------
  function renderPractice(level, section, cfg) {
    var entries = cfg.mixed || cfg.items.map(function (raw, i) {
      return { raw: raw, id: (cfg.idPrefix || (cfg.key || "x") + "-") + ((cfg.idOffset || 0) + i + 1) };
    });
    var items = entries.map(function (e) {
      var it = parseItem(e.raw); it.id = e.id; it.instruction = e.instruction; it.topic = e.topic;
      if (it.type === "choice") it.shown = shuffle(it.options);
      return it;
    });

    var html = '<header class="test-head"><div class="test-head-row"><button class="back" data-go="' + cfg.back + '" aria-label="Zamknij">' +
      ICONS.close + '</button><div class="test-title"><b>' + level + " · " + esc(cfg.title) + "</b><span>" + esc(cfg.sub) +
      '</span></div><div class="score" id="score">0/' + items.length + '</div></div><div class="progress"><i id="bar"></i></div></header><div id="result"></div>';
    if (cfg.passage) {
      html += '<section class="card"><div class="card-body passage"><h3>' + esc(cfg.passage.title) + "</h3>" +
        cfg.passage.text.map(function (p) { return "<p>" + rich(p) + "</p>"; }).join("") + "</div></section>";
    }
    if (cfg.instruction) html += '<p class="instr" style="padding:0 4px">' + esc(cfg.instruction) + "</p>";
    html += '<div class="stagger">' + items.map(function (it, i) { return card(it, i); }).join("") + "</div>" +
      '<div class="actions"><button class="btn" id="check">Sprawdź odpowiedzi</button></div>';
    render(html);

    var state = items.map(function () { return ""; }), checked = false;
    var bar = document.getElementById("bar"), checkBtn = document.getElementById("check");

    function progress() {
      var n = state.filter(function (s) { return s.trim(); }).length;
      bar.style.width = (n / items.length * 100) + "%";
    }
    app.querySelectorAll(".qcard").forEach(function (el, i) {
      var it = items[i];
      if (it.type === "choice") {
        el.querySelectorAll(".opt").forEach(function (o) {
          o.onclick = function () {
            if (checked) return;
            el.querySelectorAll(".opt").forEach(function (x) { x.classList.toggle("sel", x === o); });
            state[i] = o.dataset.v;
            var slot = el.querySelector(".slot");
            if (slot) { slot.textContent = o.dataset.v; slot.classList.add("filled"); }
            progress();
          };
        });
      } else {
        var inp = el.querySelector("input");
        inp.oninput = function () { state[i] = inp.value; progress(); };
        inp.onkeydown = function (e) {
          if (e.key !== "Enter") return;
          var next = app.querySelectorAll(".qcard input")[Array.prototype.indexOf.call(app.querySelectorAll(".qcard input"), inp) + 1];
          if (next) next.focus(); else inp.blur();
        };
      }
      el.querySelector(".report").onclick = function () {
        var txt = "Błąd w ćwiczeniu " + it.id;
        if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { toast("Skopiowano: " + txt + " — wyślij to Claude"); }, function () { toast(txt); });
        else toast(txt);
      };
    });

    checkBtn.onclick = function () {
      if (checked) return cfg.again ? renderMix(level, section) : route();
      var empty = state.filter(function (s) { return !s.trim(); }).length;
      if (empty && !checkBtn.dataset.confirm) {
        checkBtn.dataset.confirm = "1";
        checkBtn.textContent = "Bez " + empty + " " + plural(empty, "odpowiedzi", "odpowiedzi", "odpowiedzi") + " — sprawdzić?";
        return;
      }
      checked = true;
      var good = 0;
      app.querySelectorAll(".qcard").forEach(function (el, i) {
        var it = items[i], ok, nearMiss = false;
        if (it.type === "choice") {
          ok = state[i] === it.answer;
          el.querySelectorAll(".opt").forEach(function (o) {
            o.disabled = true;
            if (o.dataset.v === it.answer) o.classList.add("right");
            else if (o.dataset.v === state[i]) o.classList.add("wrong");
          });
        } else {
          var inp = el.querySelector("input");
          inp.disabled = true;
          ok = it.answers.map(norm).indexOf(norm(state[i])) !== -1;
          nearMiss = !ok && state[i].trim() && it.answers.map(plain).indexOf(plain(state[i])) !== -1;
        }
        if (ok) good++;
        el.classList.add(ok ? "ok" : "bad");
        var answerText = it.type === "choice" ? it.answer : it.answers[0];
        var box = '<div class="explain"><span class="ans">✓ ' + esc(answerText) + "</span>" +
          (it.type === "input" && it.answers.length > 1 ? '<span class="warn">Też poprawnie: ' + esc(it.answers.slice(1).join(" · ")) + "</span>" : "") +
          (it.expl ? '<span class="why">DLACZEGO</span>' + rich(it.expl) : "") +
          (nearMiss ? '<span class="warn">Prawie dobrze — sprawdź polskie znaki (ą, ę, ł, ó, ś, ż, ź, ć, ń).</span>' : "") + "</div>";
        var body = el.querySelector(".card-body");
        if (!ok) body.insertAdjacentHTML("beforeend", box);
        else if (it.expl) {
          body.insertAdjacentHTML("beforeend", '<button class="more">Pokaż wyjaśnienie</button>');
          body.querySelector(".more").onclick = function () { this.outerHTML = box; };
        }
      });
      var pct = Math.round(good / items.length * 100);
      document.getElementById("score").textContent = good + "/" + items.length;
      document.getElementById("result").innerHTML = '<div class="result"><b>' + good + " / " + items.length + "</b><span>" + pct + "% poprawnych odpowiedzi" +
        (good < items.length ? " · wyjaśnienia pod błędnymi odpowiedziami" : " · świetnie!") + "</span></div>";
      if (cfg.key) { var prev = best(cfg.key); if (prev === null || pct > prev) store("best:" + cfg.key, pct); }
      var actions = app.querySelector(".actions");
      actions.innerHTML = '<button class="btn ghost" id="check">' + (cfg.again ? "Nowy losowy zestaw" : "Spróbuj ponownie") + "</button>" +
        (cfg.next ? '<button class="btn" data-go="' + cfg.next + '">Następny zestaw</button>' : "");
      actions.querySelector("#check").onclick = function () { cfg.again ? renderMix(level, section) : route(); };
      bindGo();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
  }

  function card(it, i) {
    var q, body;
    var hasGap = /_{3,}/.test(it.q);
    if (it.type === "choice") {
      q = rich(it.q).replace(/_{3,}/, '<span class="slot">?</span>');
      var long = it.shown.some(function (o) { return o.length > 28; });
      body = '<div class="opts' + (long ? " col" : "") + '">' + it.shown.map(function (o) {
        return '<button class="opt" data-v="' + esc(o) + '">' + esc(o) + "</button>";
      }).join("") + "</div>";
    } else {
      var longest = it.answers.reduce(function (m, a) { return Math.max(m, a.length); }, 4);
      var inline = hasGap && longest <= 24;
      var input = '<input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Odpowiedź ' + (i + 1) + '"';
      if (inline) {
        q = rich(it.q).replace(/_{3,}/, '<span class="field">' + input + ' style="width:' + Math.min(16, longest * 0.62 + 2.5) + 'em"></span>');
        body = "";
      } else {
        q = rich(it.q).replace(/_{3,}/, '<span class="slot">…</span>');
        body = '<div class="input-line">' + input + ' placeholder="Wpisz odpowiedź"></div>';
      }
    }
    return '<section class="card qcard"><div class="card-top"><span class="tag green">' + (i + 1) + "</span>" +
      (it.topic ? '<span class="tag grey">' + esc(it.topic) + "</span>" : "") +
      '<button class="report" title="Zgłoś błąd">#' + esc(it.id) + " · zgłoś błąd</button></div>" +
      '<div class="card-body">' + (it.instruction ? '<p class="instr">' + esc(it.instruction) + "</p>" : "") +
      '<div class="q">' + q + "</div>" + body + "</div></section>";
  }

  // ---------- Writing ----------
  function renderWriting(level, w) {
    var key = "draft:" + w.id;
    var html = head(level + "/pisanie", w.title, w.form + " · " + w.min + "–" + w.max + " słów", level) +
      '<section class="card"><div class="card-body"><div class="q">' + rich(w.task) + "</div>" +
      (w.phrases && w.phrases.length ? '<div class="h4">Przydatne zwroty</div><div class="phrases">' +
        w.phrases.map(function (p) { return "<span>" + esc(p) + "</span>"; }).join("") + "</div>" : "") +
      "</div></section>" +
      '<section class="card"><div class="card-body"><textarea class="answer" placeholder="Napisz tekst tutaj… (zapisuje się automatycznie)"></textarea><div class="counter"></div></div></section>' +
      '<section class="card"><div class="card-body"><div class="h4" style="margin-top:0">Sprawdź się po napisaniu</div>' +
      w.checklist.map(function (c, i) { return '<label class="check"><input type="checkbox" data-c="' + i + '"><span>' + rich(c) + "</span></label>"; }).join("") +
      "</div></section>";
    render(html);
    var ta = app.querySelector("textarea"), counter = app.querySelector(".counter");
    ta.value = store(key) || "";
    function count() {
      var n = (ta.value.match(/[^\s–—-]+/g) || []).length;
      counter.textContent = "Liczba słów: " + n + " (wymagane: " + w.min + "–" + w.max + ")";
      counter.className = "counter" + (n === 0 ? "" : n >= w.min && n <= w.max ? " ok" : " bad");
    }
    ta.oninput = function () { count(); store(key, ta.value); };
    count();
    app.querySelectorAll("[data-c]").forEach(function (c) {
      var k = "chk:" + w.id + ":" + c.dataset.c;
      c.checked = store(k) === "1";
      c.onchange = function () { store(k, c.checked ? "1" : "0"); };
    });
  }

  route();
})();
