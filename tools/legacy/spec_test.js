const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("fs");
const html = fs.readFileSync(__dirname + "/spectator.html", "utf8");
const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", e => errors.push(e.message + (e.detail ? " | " + String(e.detail).slice(0,200) : "")));
const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window, d = w.document;
const $ = s => d.querySelector(s);
const $$ = s => [...d.querySelectorAll(s)];
const ev = code => { try { return w.eval(code); } catch (e) { return "<<eval-error: " + e.message + ">>"; } };
if (errors.length) { console.log("SCRIPT ERRORS:"); errors.slice(0,8).forEach(e => console.log("  ! " + e)); }
const pass = [], fail = [];
const check = (name, cond) => (cond ? pass : fail).push(name);
const U = {
  has: ev("typeof U !== 'undefined' && !!U"),
  inv: ev("(U.invaders||[]).length"),
  phase: ev("U.phase"),
  turn: ev("U.turn"),
  seen: ev("Object.keys(U.seen||{}).length"),
  drawRouted: ev("draw === specDraw"),
  spectator: ev("typeof SPECTATOR!=='undefined' && SPECTATOR===true"),
};
check("no jsdom script errors", errors.length === 0);
check("draw() rerouted to specDraw", U.drawRouted === true);
check("SPECTATOR flag set", U.spectator === true);
check("game state exists (U)", U.has === true);
check("mid-game seeded: invaders present", U.inv > 0);
check("mid-game seeded: command phase", U.phase === "command");
check("mid-game seeded: turn advanced", U.turn === 7);
check("mid-game seeded: vaccine candidates seen", U.seen > 0);
check("top status strip populated", !!$("#specStatus") && $("#specStatus").children.length > 0);
check("left gutter", !!$("#specLeft"));
check("right gutter", !!$("#specRight"));
check("body column + bodyInner", !!$(".specBody #bodyInner"));
check("log ticker", !!$("#specLog .specLogRow"));
check("anatomical SVG present", !!$(".specBody svg.anat"));
check("token layer present", !!$(".specBody #tokL"));
check("invader tokens drawn", $$(".specBody #tokL .iv").length > 0);
check("organ chips drawn", $$(".specBody .organShape").length > 0);
check("threat readout populated", $$("#specLeft .threat").length > 0);
check("antibody arsenal grid = 6 classes", $$("#specLeft .abgrid .abcell").length === 6);
check("seat roster populated", $$("#specRight .seat").length > 0);
check("vaccine/immunity readout present", !!$("#specRight .vList, #specRight .vImm, #specRight .specEmpty"));
check("status shows AP pips", $$("#specStatus .pips i").length > 0);
check("no difficulty selector", $$("button").filter(b=>/Training|Force/i.test(b.textContent)).length===0);
check("no phase action buttons", $$("button").filter(b=>/Begin command|End command|Draw the next|Undo/i.test(b.textContent)).length===0);
check("no cell action buttons", $$("button").filter(b=>/Engulf|Snipe|Produce|NET|Neutralise|Strike/i.test(b.textContent)).length===0);
check("board interactivity disabled in CSS", /\.specBody\s*,\s*\.specBody\s*\*\s*\{[^}]*pointer-events:none/.test($("#specCSS").textContent));
console.log("\n=== SPECTATOR PROTOTYPE SMOKE TEST ===");
pass.forEach(p => console.log("  [pass] " + p));
if (fail.length) { console.log("\n  FAILURES:"); fail.forEach(f => console.log("  [FAIL] " + f)); }
console.log("\n" + pass.length + " passed, " + fail.length + " failed.");
process.exit(fail.length ? 1 : 0);
