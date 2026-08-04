// Assembles the STANDALONE spectator look-prototype from the three core sources
// (v2_engine.js + v2_ui.html + art_data.js) plus the spectator layer (spec.css/spec.js).
// The base UI is left 100% intact; the spectator layer is spliced on top.
const fs = require("fs");
const path = require("path");
const dir = __dirname;
const rd = f => fs.readFileSync(path.join(dir, f), "utf8");

let engine = rd("v2_engine.js");
const cut = engine.indexOf("module.exports");
if (cut > -1) engine = engine.slice(0, cut);          // strip node export; keep globals

const art = rd("art_data.js");
const css = rd("spec.css");
const js  = rd("spec.js");

let html = rd("v2_ui.html");
if (!html.includes("/*__ENGINE__*/")) throw new Error("engine marker missing");
if (!html.includes("/*__ART__*/"))    throw new Error("art marker missing");
if (!html.includes("newG();\n</script>")) throw new Error("bootstrap tail not found");

html = html.replace("/*__ENGINE__*/", () => engine);
html = html.replace("/*__ART__*/",    () => art);
html = html.replace('<div id="app"></div>',
                    `<style id="specCSS">\n${css}\n</style>\n<div id="app"></div>`);
html = html.replace("newG();\n</script>",
                    `/* ===== spectator layer ===== */\n${js}\nspecBoot();\n</script>`);

const out = path.join(dir, "spectator.html");
fs.writeFileSync(out, html);
console.log("wrote", out, "(" + (html.length/1024).toFixed(0) + " KB)");
