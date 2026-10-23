#!/usr/bin/env node
// Sucht für jeden App-Text die Übersetzung aus dem Web-Dashboard (gleicher deutscher Text in
// dashboard2/src/lib/locales/*.ts). Aufruf: node scripts/i18n-web.js keys.json > web.json
const fs = require('fs');
const path = require('path');
const LOCALES = path.join(process.env.WEB_LOCALES ?? path.join(process.env.HOME, 'Projects/dashboard2/src/lib/locales'));
const LANGS = ['de', 'en', 'es', 'fr', 'it', 'nl', 'lv'];
const load = (l) => {
  const src = fs.readFileSync(path.join(LOCALES, `${l}.ts`), 'utf8').replace(/^const dict[^=]*=/m, 'module.exports =').replace(/export default dict;?/, '');
  const m = { exports: {} };
  new Function('module', src)(m);
  return m.exports;
};
const D = Object.fromEntries(LANGS.map((l) => [l, load(l)]));
// Gleicher Text ohne Satzzeichen am Ende zählt auch (z. B. „Gespeichert“ / „Gespeichert.“).
const norm = (s) => s.trim().replace(/[.…:!]+$/, '').replace(/\s+/g, ' ');
const exact = new Map();
const loose = new Map();
for (const [k, v] of Object.entries(D.de)) {
  if (typeof v !== 'string') continue;
  if (!exact.has(v)) exact.set(v, k);
  if (!loose.has(norm(v))) loose.set(norm(v), k);
}
const out = {};
for (const t of JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))) {
  let key = exact.get(t);
  const fuzzy = !key && !/\{\d\}/.test(t) ? loose.get(norm(t)) : undefined;
  key ??= fuzzy;
  if (!key || LANGS.slice(1).some((l) => typeof D[l][key] !== 'string')) continue;
  out[t] = Object.fromEntries(
    LANGS.slice(1).map((l) => {
      let v = D[l][key];
      if (fuzzy) {
        v = norm(v) + (t.trim().match(/[.…:!]+$/)?.[0] ?? '');
        if (/^\s/.test(t)) v = ` ${v}`;
        if (/\s$/.test(t)) v += ' ';
      }
      return [l, v];
    }),
  );
}
console.log(JSON.stringify(out, null, 1));
