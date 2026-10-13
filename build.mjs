// Bundles the anatomy kit, the siege engine and every machine into one standalone page.
// node build.mjs            → index.html (light)
// node build.mjs --dark     → index.html opening in dark
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const KIT = resolve(HERE, "vendor/anatomy/kit");
const SRC = join(HERE, "src");
const theme = process.argv.includes("--dark") ? "dark" : "light";
const only = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7);
const outName = (process.argv.find((a) => a.startsWith("--out=")) || "").slice(6) || "index.html";

const ns = new Map();
const order = [];
const add = (file, short) => {
  const abs = resolve(file);
  const name = "__N_" + short;
  ns.set(abs.toLowerCase(), name);
  order.push([abs, name]);
};

add(join(KIT, "iso-kit.mjs"), "k");
add(join(KIT, "lathe.mjs"), "G");
add(join(KIT, "tube.mjs"), "TB");
add(join(KIT, "gl.mjs"), "GL");
for (const name of ["vec", "materials", "scene", "geo", "physics", "fx", "looks", "sfx", "range", "ui", "app"]) add(join(SRC, "engine", `${name}.js`), `E_${name}`);
const machineFiles = readdirSync(join(SRC, "machines"))
  .filter((f) => /^\d\d-.*\.js$/.test(f))
  .filter((f) => !only || only.split(",").some((o) => f.startsWith(o)))
  .sort();
machineFiles.forEach((f, i) => add(join(SRC, "machines", f), `M_${i}`));

function transform(abs, name) {
  let src = readFileSync(abs, "utf8");
  const exported = [];
  const nsOf = (path) => {
    const target = resolve(dirname(abs), path).toLowerCase();
    const found = ns.get(target);
    if (!found) throw new Error(`${basename(abs)} imports unknown module ${path}`);
    return found;
  };
  src = src.replace(/^import\s+\*\s+as\s+(\w+)\s+from\s+["'](.+?)["'];?[ \t]*$/gm, (_, local, path) => `const ${local} = ${nsOf(path)};`);
  src = src.replace(/^import\s+\{([^}]+)\}\s+from\s+["'](.+?)["'];?[ \t]*$/gm, (_, names, path) => `const {${names.replace(/\s+as\s+/g, ": ")}} = ${nsOf(path)};`);
  src = src.replace(/^export\s+((?:async\s+)?function\s*\*?\s*)([\w$]+)/gm, (_, kw, id) => (exported.push(id), `${kw}${id}`));
  src = src.replace(/^export\s+(const|let|var|class)\s+([\w$]+)/gm, (_, kw, id) => (exported.push(id), `${kw} ${id}`));
  src = src.replace(/^export\s+default\s+/m, () => (exported.push("default"), "const __default = "));
  src = src.replace(/^export\s+\{([^}]+)\};?/gm, (_, names) => (names.split(",").forEach((n) => exported.push(n.trim())), ""));
  const list = exported.map((id) => (id === "default" ? "default: __default" : id)).join(", ");
  return `const ${name} = (() => {\n${src}\nreturn { ${list} };\n})();\n`;
}

const bundle = order.map(([abs, name]) => transform(abs, name)).join("\n");
const machines = `const MACHINES = [${machineFiles.map((_, i) => `__N_M_${i}.default`).join(", ")}];\n__N_E_app.start(MACHINES);\n`;
const css = readFileSync(join(SRC, "style.css"), "utf8");
const kitCss = (await import(pathToFileURL(join(KIT, "iso-kit.mjs")).href)).ISO_CSS;
const materialCss = (await import(pathToFileURL(join(SRC, "engine", "materials.js")).href)).MATERIAL_CSS;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Siege Engines</title>
<style>${kitCss}${materialCss}${css}</style>
</head>
<body class="iso" data-theme="${theme}">
<div id="app"></div>
<script type="module">
${bundle.replace(/<\/(script)/gi, "<\\/$1")}
${machines}
</script>
</body>
</html>`;

writeFileSync(join(HERE, outName), html);
console.log(`wrote ${outName} · ${(html.length / 1024).toFixed(0)} KB · ${machineFiles.length} machines`);
