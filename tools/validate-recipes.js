// node tools/validate-recipes.js — проверяет рецепты и печатает КБЖУ на порцию.
const fs = require("fs"), vm = require("vm"), path = require("path");
const dir = path.join(__dirname, "..", "recipes", "data");
const ctx = { window: {} }; ctx.window.window = ctx.window; vm.createContext(ctx);
const run = f => vm.runInContext("with(window){" + fs.readFileSync(path.join(dir, f), "utf8") + "}", ctx, { filename: f });
run("ingredients.js");
["chicken.js", "pork.js", "beef.js", "seafood.js", "other.js"].forEach(run);
const { ING, RECIPES } = ctx.window;
let errors = 0; const err = m => { errors++; console.log("ОШИБКА: " + m); };
const ids = new Set(), used = new Set();
const rows = [];
for (const r of RECIPES) {
  if (ids.has(r.id)) err("повтор id " + r.id); ids.add(r.id);
  for (const f of ["id", "t", "cat", "cu", "time", "serv", "d", "ing", "steps"]) if (!r[f]) err(r.id + ": нет поля " + f);
  if (!Array.isArray(r.steps) || r.steps.length < 5) err(r.id + ": мало шагов");
  let k = 0, p = 0, fa = 0, c = 0;
  for (const raw of r.ing.split(";")) {
    const x = raw.trim(); if (!x || x[0] === "#") continue;
    const m = x.split(":")[0].trim().split(/\s+/);
    const q = m.length === 2 && /^(\d+(?:\.\d+)?)(?:\*(\d*\.?\d+))?$/.exec(m[1]);
    if (!q) { err(r.id + ": плохая запись «" + x + "»"); continue; }
    const g = ING[m[0]]; if (!g) { err(r.id + ": нет продукта «" + m[0] + "»"); continue; }
    used.add(m[0]);
    const w = +q[1] * (q[2] ? +q[2] : 1) * (g[7] == null ? 1 : g[7]);
    k += g[2] * w / 100; p += g[3] * w / 100; fa += g[4] * w / 100; c += g[5] * w / 100;
  }
  rows.push([r.id, r.cat, r.time, r.serv, Math.round(k / r.serv), Math.round(p / r.serv), Math.round(fa / r.serv), Math.round(c / r.serv), r.fr ? "F" : "", (r.tags || []).join(",")]);
}
if (process.argv.includes("-v")) {
  console.log("id | cat | мин | порц | ккал | Б | Ж | У | заморозка | теги");
  rows.forEach(r => console.log(r.join(" | ")));
  console.log("Не используются:", Object.keys(ING).filter(k => !used.has(k)).join(", ") || "—");
}
console.log(`Рецептов: ${RECIPES.length}, продуктов: ${Object.keys(ING).length}, ошибок: ${errors}`);
process.exit(errors ? 1 : 0);
