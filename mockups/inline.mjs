// Inlines sample-data.js into each *.src.html so the mockup is one self-contained file.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
const dir = import.meta.dirname;
const data = readFileSync(`${dir}/sample-data.js`, "utf8");
for (const f of readdirSync(dir).filter((n) => n.endsWith(".src.html"))) {
  const src = readFileSync(`${dir}/${f}`, "utf8");
  const tag = '<script src="sample-data.js"></script>';
  if (!src.includes(tag)) { console.log("NO TAG", f); continue; }
  const out = src.replace(tag, () => `<script>${data}</script>`);
  writeFileSync(`${dir}/${f.replace(".src.html", ".html")}`, out);
  console.log(f, out.length);
}
