// Sprawdza dane ćwiczeń: node egzamin/tools/validate.js
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = path.join(__dirname, "..", "data");
const ctx = { window: {} }; ctx.window.window = ctx.window; vm.createContext(ctx);
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const files = [...html.matchAll(/src="data\/([^"]+)"/g)].map(m => m[1]);
for (const f of files) {
  const p = path.join(dir, f);
  if (!fs.existsSync(p)) { console.log("BRAK PLIKU:", f); continue; }
  const code = fs.readFileSync(p, "utf8").replace(/^(T|R|W)\(/gm, "window.$1(");
  vm.runInContext(code, ctx, { filename: f });
}
const B = ctx.window.BANK, errors = [], seen = new Map(), ids = new Set();
const LEVELS = ["B1", "B2", "C1", "C2"];
function check(it, where) {
  if (!Array.isArray(it) || it.length < 3) return errors.push(where + ": zły format");
  const [q, a, e] = it;
  if (!q || typeof q !== "string") errors.push(where + ": brak pytania");
  if (!e || e.length < 15) errors.push(where + ": brak/za krótkie wyjaśnienie");
  if ((q.match(/_{3,}/g) || []).length > 1) errors.push(where + ": więcej niż jedna luka");
  if (/"/.test(q + a + e)) errors.push(where + ": cudzysłów ASCII");
  if (a[0] === "=") {
    const ans = a.slice(1).split("|");
    if (ans.some(x => !x.trim())) errors.push(where + ": pusta odpowiedź");
  } else {
    const opts = a.split("|");
    const stars = opts.filter(o => o[0] === "*");
    if (stars.length !== 1) errors.push(where + ": liczba poprawnych = " + stars.length);
    if (opts.length < 2) errors.push(where + ": za mało opcji");
    const clean = opts.map(o => o.replace(/^\*/, "").trim().toLowerCase());
    if (new Set(clean).size !== clean.length) errors.push(where + ": powtórzone opcje");
  }
  const key = q.replace(/\s+/g, " ").trim().toLowerCase();
  if (seen.has(key)) errors.push(where + ": duplikat pytania z " + seen.get(key)); else seen.set(key, where);
}
let n = 0;
for (const t of B.topics) {
  if (!LEVELS.includes(t.level)) errors.push(t.id + ": zły poziom");
  if (ids.has(t.id)) errors.push(t.id + ": powtórzone id tematu"); ids.add(t.id);
  t.items.forEach((it, i) => { check(it, t.id + "-" + (i + 1)); n++; });
}
for (const r of B.reading) {
  if (ids.has("r" + r.id)) errors.push(r.id + ": powtórzone id"); ids.add("r" + r.id);
  r.items.forEach((it, i) => { check(it, "r:" + r.id + "-" + (i + 1)); n++; });
}
for (const w of B.writing) {
  if (ids.has("w" + w.id)) errors.push(w.id + ": powtórzone id"); ids.add("w" + w.id);
  if (!(w.min > 0 && w.max > w.min) || !w.checklist || !w.checklist.length) errors.push("w:" + w.id + ": niekompletne");
  n++;
}
const by = {};
for (const t of B.topics) by[t.section + " " + t.level] = (by[t.section + " " + t.level] || 0) + t.items.length;
for (const r of B.reading) by["czytanie " + r.level] = (by["czytanie " + r.level] || 0) + r.items.length;
for (const w of B.writing) by["pisanie " + w.level] = (by["pisanie " + w.level] || 0) + 1;
console.log(by);
console.log("RAZEM ćwiczeń:", n);
if (errors.length) { console.log(errors.join("\n")); process.exit(1); } else console.log("OK — brak błędów");
