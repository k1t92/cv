// Генератор задач для chess.html.
// Stockfish играет сам с собой с намеренными ошибками; из получившихся позиций отбираются
// форсированные маты в 2–4 хода и тактические удары, у которых единственное решение.
//
// Запуск (нужен chess.js: npm i chess.js@1.4.0):
//   node tools/gen-chess-puzzles.js <секунд> <файл-вывода.jsonl>          — маты и тактика из самоигры
//   node tools/gen-chess-puzzles.js --mates <секунд> <файл-вывода.jsonl>  — только маты (быстрее находит)
// Несколько процессов параллельно, затем: node tools/gen-chess-puzzles.js --merge out*.jsonl > chess-puzzles.json
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Chess } = require('chess.js');

const SF = path.join(__dirname, '..', 'stockfish', 'stockfish-18-lite-single.js');
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

class Engine {
  constructor() {
    this.p = spawn(process.execPath, [SF]);
    this.buf = ''; this.waiters = [];
    this.p.stdout.on('data', d => {
      this.buf += d;
      const lines = this.buf.split('\n'); this.buf = lines.pop();
      for (const l of lines) for (const w of [...this.waiters]) w(l.trim());
    });
  }
  send(c) { this.p.stdin.write(c + '\n'); }
  wait(pred) { return new Promise(res => { const w = l => { if (pred(l)) { this.waiters.splice(this.waiters.indexOf(w), 1); res(l); } }; this.waiters.push(w); }); }
  async init() { this.send('uci'); await this.wait(l => l === 'uciok'); this.send('setoption name Hash value 64'); this.send('isready'); await this.wait(l => l === 'readyok'); }
  // возвращает строки анализа [{score:{cp}|{mate}, pv:[...]}] с точки зрения стороны, которая ходит
  async go(fen, depth, multipv = 1) {
    this.send(`setoption name MultiPV value ${multipv}`);
    this.send('position fen ' + fen);
    const lines = [];
    const collect = l => {
      if (!l.startsWith('info ') || !l.includes(' pv ') || l.includes('bound')) return;
      const mp = +(/ multipv (\d+)/.exec(l) || [0, 1])[1];
      const sc = / score (cp|mate) (-?\d+)/.exec(l); if (!sc) return;
      lines[mp - 1] = { score: sc[1] === 'cp' ? { cp: +sc[2] } : { mate: +sc[2] }, pv: l.split(' pv ')[1].split(' ') };
    };
    this.waiters.push(collect);
    this.send('go depth ' + depth);
    await this.wait(l => l.startsWith('bestmove'));
    this.waiters.splice(this.waiters.indexOf(collect), 1);
    return lines.filter(Boolean);
  }
  quit() { this.send('quit'); }
}

const uci = m => m.from + m.to + (m.promotion || '');
const mv = u => ({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
const cpOf = s => s.mate !== undefined ? (s.mate > 0 ? 10000 - s.mate : -10000 - s.mate) : s.cp;
function material(ch, color) {
  let s = 0;
  for (const row of ch.board()) for (const p of row) if (p) s += (p.color === color ? 1 : -1) * VAL[p.type];
  return s;
}
// фигура, которой только что сходили, стоит под боем и её можно выгодно взять — жертва
function isSacrifice(chAfter, m) {
  const opp = chAfter.turn();
  if (!chAfter.isAttacked(m.to, opp)) return false;
  const defended = chAfter.isAttacked(m.to, m.color);
  const minAttacker = Math.min(...chAfter.moves({ verbose: true }).filter(x => x.to === m.to).map(x => VAL[x.piece]), 99);
  return !defended || minAttacker < VAL[m.piece];
}
function attacksAfter(chAfter, m) {
  // сколько ценных фигур соперника бьёт сходившая фигура (для пометки «вилка»)
  const tmp = new Chess(chAfter.fen().replace(/ [wb] /, ` ${m.color} `).replace(/ [KQkq-]+ /, ' - ').replace(/ [a-h][36] /, ' - '));
  let n = 0;
  try { for (const x of tmp.moves({ square: m.to, verbose: true })) if (x.captured && VAL[x.captured] >= 3) n++; } catch {}
  return n + (chAfter.inCheck() ? 1 : 0);
}

// Решение мата: на каждом ходу решающего — единственный ход, ведущий к мату за оставшееся число ходов
// (последний матующий ход может быть любым — приложение принимает любой мат). Ответы — лучшая защита.
async function verifyMate(eng, fen, n) {
  const ch = new Chess(fen); const sol = [];
  for (let left = n; left >= 1; left--) {
    const lines = await eng.go(ch.fen(), 18, left > 1 ? 2 : 1);
    if (!lines[0] || lines[0].score.mate !== left) return null;
    if (left > 1 && lines[1] && lines[1].score.mate !== undefined && lines[1].score.mate > 0 && lines[1].score.mate <= left) return null;
    const m = ch.move(mv(lines[0].pv[0])); sol.push(uci(m));
    if (left === 1) return ch.isCheckmate() ? sol : null;
    const def = await eng.go(ch.fen(), 14, 1);
    if (!def[0]) return null;
    sol.push(uci(ch.move(mv(def[0].pv[0]))));
  }
  return null;
}

async function verifyTactic(eng, fen) {
  const ch = new Chess(fen);
  const lines = await eng.go(fen, 16, 2);
  if (lines.length < 2 || lines[0].score.mate !== undefined) return null;
  const best = cpOf(lines[0].score), second = cpOf(lines[1].score);
  if (best < 200 || second > best - 150 || second > 100) return null;
  const pv = lines[0].pv.slice(0, 5);
  const first = ch.move(mv(pv[0]));
  // слишком просто: просто забрать незащищённую фигуру
  if (first.captured && !new Chess(fen).isAttacked(first.to, first.color === 'w' ? 'b' : 'w') ) return null;
  return { pv, fork: attacksAfter(ch, first) >= 2, sac: isSacrifice(ch, first) };
}

function pick(lines, ch) {
  const r = Math.random();
  if (r < 0.06) { const ms = ch.moves(); return ms[Math.floor(Math.random() * ms.length)]; } // грубая ошибка
  if (r < 0.25 && lines.length > 1) return mv(lines[1 + Math.floor(Math.random() * (lines.length - 1))].pv[0]);
  return mv(lines[0].pv[0]);
}

// Режим --mates: в каждой позиции перебираем все ходы стороны, которая ходит, и ищем те,
// после которых у соперника появляется форсированный мат — маты встречаются в ~30 раз чаще.
async function scanMates(eng, ch, seen, out) {
  const fen = ch.fen();
  for (const m of shuffleArr(ch.moves({ verbose: true }))) {
    const c = new Chess(fen); c.move(m);
    if (c.isGameOver()) continue;
    const key = c.fen().split(' ').slice(0, 2).join(' ');
    if (seen.has(key) || material(c, c.turn()) > 5) continue;
    const q = await eng.go(c.fen(), 8, 1);
    const n = q[0] && q[0].score.mate;
    if (!(n >= 2 && n <= 4)) continue;
    const sol = await verifyMate(eng, c.fen(), n);
    if (!sol) continue;
    const t = new Chess(c.fen()); const first = t.move(mv(sol[0]));
    const sac = isSacrifice(t, first);
    if (n === 2 && first.san.includes('+') && !sac) continue;
    seen.add(key);
    fs.appendFileSync(out, JSON.stringify({ t: 'm' + n, f: fen, s: [uci(m), ...sol].join(' '), sac: sac ? 1 : 0, q: first.san.includes('+') ? 0 : 1 }) + '\n');
    return 1; // не больше одной задачи из позиции — иначе они будут похожи
  }
  return 0;
}
const shuffleArr = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

async function run(seconds, out, matesOnly) {
  const eng = new Engine(); await eng.init();
  const seen = new Set(); const stop = Date.now() + seconds * 1000;
  let games = 0, found = 0;
  while (Date.now() < stop) {
    const ch = new Chess(); games++;
    let prevFen = null, prevMove = null, lost = 0;
    for (let ply = 0; ply < 140 && !ch.isGameOver() && Date.now() < stop; ply++) {
      const fen = ch.fen();
      const lines = await eng.go(fen, ply < 6 ? 5 : 7, ply < 6 ? 5 : 3);
      if (!lines.length) break;
      const key = fen.split(' ').slice(0, 2).join(' ');
      if (matesOnly) { if (ply >= 10 && ply % 2 === games % 2) found += await scanMates(eng, ch, seen, out); }
      else if (ply >= 8 && prevMove && !seen.has(key)) {
        const s = lines[0].score;
        let rec = null;
        // в позициях с подавляющим перевесом мат или выигрыш очевидны — такие не берём
        if (s.mate >= 2 && s.mate <= 4 && material(ch, ch.turn()) <= 5) {
          const sol = await verifyMate(eng, fen, s.mate);
          if (sol) {
            const t = new Chess(fen); const first = t.move(mv(sol[0]));
            const easy = s.mate === 2 && first.san.includes('+') && !isSacrifice(t, first);
            if (!easy) rec = { t: 'm' + s.mate, f: prevFen, s: [prevMove, ...sol].join(' '), sac: isSacrifice(t, first) ? 1 : 0, q: first.san.includes('+') ? 0 : 1 };
          }
        } else if (s.mate === undefined && s.cp >= 200 && material(ch, ch.turn()) <= 0.5) {
          const v = await verifyTactic(eng, fen);
          if (v) rec = { t: v.fork ? 'fork' : 'tac', f: prevFen, s: [prevMove, ...v.pv].join(' '), sac: v.sac ? 1 : 0 };
        }
        if (rec) { seen.add(key); found++; fs.appendFileSync(out, JSON.stringify(rec) + '\n'); }
      }
      // партия решена — дальше пойдут только однообразные позиции с лишним ферзём
      const big = Math.abs(cpOf(lines[0].score)) > 800 ? (lost = (lost || 0) + 1) : (lost = 0);
      if (big >= 3) break;
      prevFen = fen;
      const m = ch.move(pick(lines, ch));
      prevMove = uci(m);
    }
  }
  eng.quit();
  console.error(`${out}: ${games} партий, ${found} задач`);
  process.exit(0);
}

function merge(files) {
  const seen = new Set(), all = [];
  for (const f of files) for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!l.trim()) continue;
    const r = JSON.parse(l);
    const k = r.f.split(' ').slice(0, 2).join(' ');
    if (seen.has(k)) continue;
    seen.add(k); all.push(r);
  }
  process.stdout.write(JSON.stringify(all));
  const by = {}; for (const r of all) by[r.t] = (by[r.t] || 0) + 1;
  console.error(by);
}

if (process.argv[2] === '--merge') merge(process.argv.slice(3));
else if (process.argv[2] === '--mates') run(+process.argv[3] || 60, process.argv[4] || 'mates.jsonl', true);
else run(+process.argv[2] || 60, process.argv[3] || 'puzzles.jsonl', false);
