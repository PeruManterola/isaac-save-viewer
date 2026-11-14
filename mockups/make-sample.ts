// Dumps real data from fixture save 3 for the UI mockups. Not part of the app.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CATEGORIES } from "../src/save/categories.js";
import { createSaveModel, getMarksProgress, getProgress } from "../src/save/model.js";
import { parseSaveFile } from "../src/save/parse.js";

const root = path.join(import.meta.dirname, "..");
const buf = readFileSync(path.join(root, "test/fixtures/rep+persistentgamedata3.dat"));
const model = createSaveModel(parseSaveFile(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)));
const uri = (p: string) => `data:image/png;base64,${readFileSync(path.join(root, "static", p)).toString("base64")}`;

const ach = model.achievements;
const locked = ach.filter((a) => !a.unlocked);
const pick: typeof ach[number][] = [];
for (const c of CATEGORIES) {
  pick.push(...locked.filter((a) => a.category === c.id).slice(0, 3));
  pick.push(...ach.filter((a) => a.unlocked && a.category === c.id).slice(0, 2));
}
const items = [...model.items.filter((i) => !i.unlocked), ...model.items.filter((i) => i.unlocked).slice(0, 17)].sort((a, b) => a.id - b.id);

const sample = {
  note: "Real data from the user's save 3 (rep+persistentgamedata3.dat). Achievements/items are a SUBSET; totals are the real totals.",
  totals: { achievements: getProgress(ach), items: getProgress(model.items), marks: getMarksProgress(model.marks), challenges: model.challenges },
  categories: CATEGORIES.map((c) => ({ ...c, ...getProgress(ach.filter((a) => a.category === c.id)) })),
  achievements: pick.sort((a, b) => a.id - b.id).map((a) => ({ id: a.id, name: a.name, category: a.category, inGameDescription: a.inGameDescription, unlockDescription: a.unlockDescription, unlocked: a.unlocked, icon: a.icon === undefined ? null : uri(a.icon) })),
  lockedAchievementNames: locked.map((a) => ({ id: a.id, name: a.name, category: a.category, unlockDescription: a.unlockDescription })),
  items: items.map((i) => ({ id: i.id, name: i.name, pools: i.pools, unlocked: i.unlocked, icon: uri(i.icon) })),
  marks: model.marks.marks.map((m) => ({ id: m.id, name: m.name, icon: uri(m.icon) })),
  characters: model.marks.characters.map((c) => ({ id: c.id, name: c.name, tainted: c.tainted, icon: uri(c.icon), done: c.marks.map((m) => m.unlocked) })),
};
writeFileSync(path.join(root, "mockups/sample-data.js"), `window.SAMPLE = ${JSON.stringify(sample)};\n`);
console.log(sample.totals, sample.categories, sample.achievements.length, sample.items.length);
