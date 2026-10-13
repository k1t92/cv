(function () {
  "use strict";

  var C = window.CATALOG;
  var app = document.getElementById("app");
  var ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

  // ---------- Icons (Material Symbols, Apache 2.0) ----------
  var ICONS = {
    headphones: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0-9 9v7a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H5v-1a7 7 0 0 1 14 0v1h-1a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-7a9 9 0 0 0-9-9z"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M2 6.5C3.8 5.5 6 5 8 5s3.4.5 4 1v13c-.9-.6-2.3-1-4-1s-4 .4-6 1.4z"/><path d="M13 6c.5-.4 1.3-.7 2.2-.9V14l1.6-1.3 1.6 1.3V4.7c1.3.2 2.5.6 3.6 1.3v13.4c-2-1-4.3-1.4-6-1.4s-2.9.4-3 1z"/></svg>',
    grammar: '<svg viewBox="0 0 24 24"><path d="M21 5c-1.1-.35-2.3-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/><path d="M14 9h5v1.5h-5zM14 11.5h5V13h-5zM14 14h5v1.5h-5z"/></svg>',
    mic: '<svg viewBox="0 0 24 24"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5.3-3a5.3 5.3 0 0 1-10.6 0H5c0 3.4 2.7 6.2 6 6.7V21h2v-3.3c3.3-.5 6-3.3 6-6.7z"/></svg>',
    pen: '<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>',
    lock: '<svg class="lock" viewBox="0 0 24 24"><path d="M18 8h-1V6a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zM9 6a3 3 0 0 1 6 0v2H9zm3 11a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/></svg>',
    verified: '<svg viewBox="0 0 24 24"><path d="M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82L8.6 22.5l3.4-1.47 3.4 1.46 1.89-3.19 3.61-.82-.34-3.69L23 12zm-12.91 4.72l-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.35z"/></svg>',
    sparkles: '<svg viewBox="0 0 24 24"><path d="M9 4l1.8 5.2L16 11l-5.2 1.8L9 18l-1.8-5.2L2 11l5.2-1.8zM18 2l.9 2.1L21 5l-2.1.9L18 8l-.9-2.1L15 5l2.1-.9zM18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    chev: '<svg class="chev" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
    caret: '<svg class="caret" viewBox="0 0 12 12" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 4.5L6 8l3.5-3.5"/></svg>',
    bulb: '<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    stop: '<svg viewBox="0 0 24 24"><path d="M7 7h10v10H7z"/></svg>'
  };

  // ---------- Helpers ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
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
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2400);
  }
  function norm(s) {
    return String(s).toLowerCase().replace(/[–—]/g, "-").replace(/[.,!?;:«»"<>]/g, "")
      .replace(/\s+/g, " ").trim();
  }
  function answers(gap) {
    return [].concat(gap.answer).map(norm);
  }
  function fmt(n) { return Math.round(n * 10) / 10 + ""; }
  function sessionsFor(level, section) {
    var meta = C.sections[section];
    var prefix = level + "/" + section + "/";
    var loaded = Object.keys(window.SESSIONS).filter(function (k) { return k.indexOf(prefix) === 0; })
      .map(function (k) { return window.SESSIONS[k]; });
    var loadedIds = loaded.map(function (s) { return s.id; });
    var placeholders = (C.sessions[level] || []).filter(function (t) {
      return loadedIds.indexOf(window.slugify(t)) === -1;
    }).map(function (t) { return { id: window.slugify(t), title: t, points: C.defaultPoints, tasks: null }; });
    var demos = loaded.filter(function (s) { return s.demo; });
    var real = loaded.filter(function (s) { return !s.demo; });
    // Kolejność: dema, potem sesje w kolejności z katalogu.
    var order = (C.sessions[level] || []).map(window.slugify);
    var dated = real.concat(placeholders).sort(function (a, b) {
      var ia = order.indexOf(a.id), ib = order.indexOf(b.id);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    });
    return { meta: meta, demos: demos, dated: dated };
  }
  function totalPoints(s) {
    if (!s.tasks) return s.points || C.defaultPoints;
    return s.points || s.tasks.reduce(function (sum, t) { return sum + (t.points || 0); }, 0);
  }

  // ---------- Router ----------
  function route() {
    app.oninput = app.onchange = null;
    window.speechSynthesis && speechSynthesis.cancel();
    var parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
    window.scrollTo(0, 0);
    if (parts.length === 0) return renderHome();
    var level = parts[0], section = parts[1], id = parts[2];
    if (C.levels.indexOf(level) === -1 || (section && !C.sections[section])) return go("");
    if (!section) return go("");
    if (!id) return renderSection(level, section);
    var s = window.SESSIONS[level + "/" + section + "/" + id];
    if (!s) return go(level + "/" + section);
    renderTest(level, section, s);
  }
  function go(path) { location.hash = "#/" + path; }
  window.addEventListener("hashchange", route);

  // ---------- Home ----------
  function renderHome() {
    var level = store("level") || "B1";
    if (C.levels.indexOf(level) === -1) level = "B1";
    var html = '<header class="hero"><h1>Egzamin z polskiego</h1><p>Trening do certyfikatu z języka polskiego</p></header>' +
      '<div class="levels" role="group" aria-label="Poziom">' +
      C.levels.map(function (l) {
        return '<button data-level="' + l + '" aria-pressed="' + (l === level) + '">' + l + "</button>";
      }).join("") + "</div>" +
      '<div class="label">' + ICONS.verified + "Części egzaminu</div><div class=\"list\">" +
      Object.keys(C.sections).map(function (key) {
        var m = C.sections[key];
        return '<button class="row" data-go="' + level + "/" + key + '"><div class="row-icon">' + ICONS[m.icon] +
          '</div><div class="row-body"><div class="row-title">' + m.title + '</div><div class="row-desc">' +
          m.subtitle + "</div></div>" + ICONS.chev + "</button>";
      }).join("") + "</div>";
    app.innerHTML = html;
    app.querySelectorAll("[data-level]").forEach(function (b) {
      b.onclick = function () { store("level", b.dataset.level); renderHome(); };
    });
    bindGo();
  }
  function bindGo() {
    app.querySelectorAll("[data-go]").forEach(function (b) {
      b.onclick = function () { go(b.dataset.go); };
    });
  }

  // ---------- Section (session list) ----------
  function sessionRow(level, section, s, meta) {
    var locked = !s.tasks;
    var pts = meta.showPoints ? '<span class="pts">' + fmt(totalPoints(s)) + " pkt</span>" : "";
    return '<button class="row" ' + (locked ? 'data-locked="1"' : 'data-go="' + level + "/" + section + "/" + s.id + '"') +
      '><div class="row-icon">' + ICONS[meta.icon] + '</div><div class="row-body"><div class="row-title">' +
      esc(s.title) + "</div>" + pts + "</div>" + (locked ? ICONS.lock : ICONS.chev) + "</button>";
  }
  function renderSection(level, section) {
    var data = sessionsFor(level, section), meta = data.meta;
    var html = '<header class="page-head"><button class="back" data-go="" aria-label="Wstecz">' + ICONS.back +
      '</button><div><h1 class="page-title">' + meta.title + '</h1><div class="page-sub"><span class="lvl">' + level +
      "</span>" + meta.subtitle + "</div></div></header>";
    if (meta.ai) {
      html += '<button class="ai-card" data-ai="1"><div class="ai-icon">' + ICONS.sparkles +
        '</div><div class="ai-text"><div class="ai-title">Wygeneruj test z AI</div><div class="ai-sub">Dodatkowy trening w formacie egzaminu</div></div>' +
        ICONS.chev + "</button>";
    }
    if (data.demos.length) {
      html += '<div class="label grey">' + ICONS.verified + 'Przykładowe testy</div><div class="list">' +
        data.demos.map(function (s) { return sessionRow(level, section, s, meta); }).join("") + "</div><div style=\"height:22px\"></div>";
    }
    html += '<div class="label' + (meta.ai ? " grey" : "") + '">' + ICONS.verified + 'Sesje egzaminacyjne</div><div class="list">' +
      data.dated.map(function (s) { return sessionRow(level, section, s, meta); }).join("") + "</div>";
    app.innerHTML = html;
    bindGo();
    app.querySelectorAll("[data-locked]").forEach(function (b) {
      b.onclick = function () { toast("Ta sesja nie jest jeszcze dostępna"); };
    });
    var ai = app.querySelector("[data-ai]");
    if (ai) ai.onclick = function () { toast("Generator testów AI będzie dostępny wkrótce"); };
  }

  // ---------- Test ----------
  function gapHtml(ti, n, gap, task) {
    var key = ti + ":" + n;
    var hint = gap.hint ? '<span class="hint">(' + esc(gap.hint) + ")</span>" : "";
    var options = gap.options || (task.bank ? task.bank.filter(function (w, i, a) { return a.indexOf(w) === i; }) : null);
    if (options) {
      return hint + '<span class="gap" data-key="' + key + '"><span class="gap-n">' + n + '.</span><select required aria-label="Luka ' + n +
        '"><option value="">?</option>' + options.map(function (o) {
          return '<option value="' + esc(o) + '">' + esc(o) + "</option>";
        }).join("") + "</select>" + ICONS.caret + "</span>";
    }
    return hint + '<span class="gap' + (gap.wide ? " wide" : "") + '" data-key="' + key + '"><span class="gap-n">' + n +
      '.</span><input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Luka ' + n + '"></span>';
  }

  function renderTask(task, ti) {
    var label = task.title || "Zadanie " + (ROMAN[ti] || ti + 1);
    var top = '<div class="task-top"><div class="task-tags"><span class="tag green">' + esc(label) + "</span>" +
      (task.points ? '<span class="tag grey">' + fmt(task.points) + " pkt</span>" : "") + "</div>";
    if (task.instruction) top += '<p class="instr">' + task.instruction + "</p>";
    if (task.audio) {
      top += '<div class="audio-box">' + (task.audio.src
        ? '<audio controls preload="none" src="' + esc(task.audio.src) + '"></audio>'
        : '<button class="play" data-tts="' + ti + '" aria-label="Odtwórz nagranie">' + ICONS.play +
          '</button><span class="audio-note">Nagranie (synteza mowy). Możesz odtworzyć je dwa razy.</span>') + "</div>";
    }
    if (task.example) {
      top += '<div class="example"><div class="example-h">' + ICONS.bulb + "PRZYKŁAD</div>" + task.example + "</div>";
    }
    if (task.bank) {
      top += '<div class="bank"><div class="bank-words">' + task.bank.map(function (w) {
        return "<span>" + esc(w) + "</span>";
      }).join("") + "</div><small>" + (task.bankNote || "Jeden wyraz w ramce jest niepotrzebny.") + "</small></div>";
    }
    if (task.text) {
      top += '<div class="content" style="padding:14px 0 0">' + [].concat(task.text).map(function (p) { return "<p>" + p + "</p>"; }).join("") + "</div>";
    }
    top += "</div>";

    var body = "";
    if (task.type === "writing") {
      body = [].concat(task.content || []).map(function (p) { return "<p>" + p + "</p>"; }).join("") +
        '<textarea class="answer" data-writing="' + ti + '" placeholder="Napisz tekst tutaj…"></textarea>' +
        '<div class="counter" data-counter="' + ti + '"></div>';
    } else if (task.type === "speaking") {
      body = [].concat(task.content || []).map(function (p) { return "<p>" + p + "</p>"; }).join("") +
        (window.MediaRecorder && navigator.mediaDevices
          ? '<div class="rec" data-rec="' + ti + '"><button type="button">Nagraj odpowiedź</button><span class="time"></span></div>'
          : "");
    } else {
      body = [].concat(task.content || []).map(function (p) {
        return "<p>" + p.replace(/\[\[(\d+)\]\]/g, function (_, n) {
          var gap = task.gaps && task.gaps[n];
          return gap ? gapHtml(ti, n, gap, task) : "[[" + n + "]]";
        }) + "</p>";
      }).join("");
      if (task.transcript) body += '<div class="transcript" data-transcript="' + ti + '" hidden><b>Transkrypcja:</b><br>' + task.transcript + "</div>";
    }
    return '<section class="task">' + top + '<div class="content">' + body + "</div></section>";
  }

  function renderTest(level, section, s) {
    var meta = C.sections[section];
    var gradable = s.tasks.some(function (t) { return t.gaps; });
    var total = s.tasks.reduce(function (sum, t) { return sum + (t.gaps ? (t.points || 0) : 0); }, 0);
    var html = '<header class="test-head"><div class="test-head-row"><button class="back" data-go="' + level + "/" + section +
      '" aria-label="Zamknij">' + ICONS.close + '</button><div class="test-title"><b>' + level + " · " + esc(s.name || meta.subtitle.split(" · ")[0]) +
      "</b><span>" + esc(s.title) + "</span></div>" + (gradable ? '<div class="score" id="score">0/' + fmt(total) + "</div>" : "") +
      '</div><div class="progress"><i id="bar"></i></div></header>' +
      '<div id="result"></div>' +
      s.tasks.map(renderTask).join("") +
      (gradable ? '<div class="actions" id="actions"><button class="btn" id="check">Sprawdź odpowiedzi</button></div>' : "") +
      (s.source ? '<p class="source">Źródło: ' + esc(s.source) + "</p>" : "");
    app.innerHTML = html;
    bindGo();

    var checked = false;
    var fields = Array.prototype.slice.call(app.querySelectorAll(".gap"));
    var bar = document.getElementById("bar");

    function updateProgress() {
      var writing = app.querySelectorAll("[data-writing]");
      if (fields.length) {
        var filled = fields.filter(function (g) { return g.querySelector("select,input").value.trim(); }).length;
        bar.style.width = (filled / fields.length * 100) + "%";
      } else if (writing.length) {
        var done = Array.prototype.filter.call(writing, function (w) { return w.value.trim(); }).length;
        bar.style.width = (done / writing.length * 100) + "%";
      }
      // Wyrazy z ramki wykorzystane w lukach.
      app.querySelectorAll(".task").forEach(function (el, ti) {
        var task = s.tasks[ti];
        if (!task.bank) return;
        var used = Array.prototype.map.call(el.querySelectorAll(".gap select"), function (x) { return x.value; }).filter(Boolean);
        el.querySelectorAll(".bank-words span").forEach(function (chip) {
          var i = used.indexOf(chip.textContent);
          chip.classList.toggle("used", i !== -1);
          if (i !== -1) used.splice(i, 1);
        });
      });
    }
    app.oninput = function (e) {
      if (checked && e.target.closest(".gap")) return;
      updateProgress();
    };
    app.onchange = updateProgress;

    // Pisanie — licznik słów.
    app.querySelectorAll("[data-writing]").forEach(function (ta) {
      var ti = ta.dataset.writing, task = s.tasks[ti];
      var counter = app.querySelector('[data-counter="' + ti + '"]');
      var draftKey = "draft:" + level + "/" + section + "/" + s.id + ":" + ti;
      ta.value = store(draftKey) || "";
      function count() {
        var n = (ta.value.match(/[^\s–—-]+/g) || []).length;
        var range = task.minWords ? " (wymagane: " + task.minWords + (task.maxWords ? "–" + task.maxWords : "+") + ")" : "";
        counter.textContent = "Liczba słów: " + n + range;
        counter.className = "counter" + (task.minWords ? (n >= task.minWords && (!task.maxWords || n <= task.maxWords) ? " ok" : n ? " bad" : "") : "");
      }
      ta.addEventListener("input", function () { count(); store(draftKey, ta.value); });
      count();
    });

    // Słuchanie — synteza mowy.
    var plays = {};
    app.querySelectorAll("[data-tts]").forEach(function (btn) {
      btn.onclick = function () {
        var ti = btn.dataset.tts, task = s.tasks[ti];
        if (!window.speechSynthesis) return toast("Twoja przeglądarka nie obsługuje syntezy mowy");
        if (speechSynthesis.speaking) { speechSynthesis.cancel(); btn.innerHTML = ICONS.play; return; }
        plays[ti] = (plays[ti] || 0) + 1;
        if (plays[ti] > 2) return toast("Nagranie można odtworzyć tylko dwa razy");
        var u = new SpeechSynthesisUtterance(task.audio.tts);
        u.lang = "pl-PL"; u.rate = 0.95;
        var voice = speechSynthesis.getVoices().filter(function (v) { return /^pl/i.test(v.lang); })[0];
        if (voice) u.voice = voice;
        u.onend = u.onerror = function () { btn.innerHTML = ICONS.play; };
        btn.innerHTML = ICONS.stop;
        speechSynthesis.speak(u);
      };
    });

    // Mówienie — nagrywanie.
    app.querySelectorAll("[data-rec]").forEach(function (box) {
      var btn = box.querySelector("button"), time = box.querySelector(".time");
      var rec, chunks, timer, started, audio;
      btn.onclick = function () {
        if (rec && rec.state === "recording") { rec.stop(); return; }
        navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
          chunks = []; rec = new MediaRecorder(stream);
          rec.ondataavailable = function (e) { chunks.push(e.data); };
          rec.onstop = function () {
            clearInterval(timer);
            stream.getTracks().forEach(function (t) { t.stop(); });
            btn.textContent = "Nagraj ponownie"; btn.classList.remove("on");
            if (audio) audio.remove();
            audio = document.createElement("audio");
            audio.controls = true; audio.src = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType }));
            box.appendChild(audio);
          };
          rec.start(); started = Date.now();
          btn.textContent = "Zatrzymaj"; btn.classList.add("on");
          timer = setInterval(function () {
            var sec = Math.floor((Date.now() - started) / 1000);
            time.textContent = Math.floor(sec / 60) + ":" + ("0" + sec % 60).slice(-2);
          }, 250);
        }).catch(function () { toast("Brak dostępu do mikrofonu"); });
      };
    });

    // Sprawdzanie.
    var checkBtn = document.getElementById("check");
    if (checkBtn) checkBtn.onclick = function () { checked ? reset() : check(); };

    function check() {
      checked = true;
      var score = 0, good = 0, all = 0;
      s.tasks.forEach(function (task, ti) {
        if (!task.gaps) return;
        var keys = Object.keys(task.gaps), ok = 0;
        keys.forEach(function (n) {
          var el = app.querySelector('[data-key="' + ti + ":" + n + '"]');
          if (!el) return;
          var field = el.querySelector("select,input");
          var right = answers(task.gaps[n]).indexOf(norm(field.value)) !== -1;
          el.classList.add(right ? "ok" : "bad");
          field.disabled = true;
          if (right) ok++;
          else el.insertAdjacentHTML("afterend", '<span class="fix">→ ' + esc([].concat(task.gaps[n].answer)[0]) + "</span>");
        });
        good += ok; all += keys.length;
        score += keys.length ? (task.points || 0) * ok / keys.length : 0;
        var tr = app.querySelector('[data-transcript="' + ti + '"]');
        if (tr) tr.hidden = false;
      });
      document.getElementById("score").textContent = fmt(score) + "/" + fmt(total);
      document.getElementById("result").innerHTML = '<div class="result"><b>' + fmt(score) + " / " + fmt(total) +
        ' pkt</b>Poprawne odpowiedzi: ' + good + " z " + all + " (" + Math.round(all ? good / all * 100 : 0) + "%)</div>";
      checkBtn.textContent = "Spróbuj ponownie";
      checkBtn.classList.add("ghost");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    function reset() {
      renderTest(level, section, s);
    }
    updateProgress();
  }

  route();
})();
