#!/usr/bin/env node
// Listet deutsche Zeichenketten, die noch nicht in tr('…') stehen (Prüfung nach scripts/i18n-wrap.js).
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const ROOT = path.join(__dirname, '..', 'src');
const SKIP = [/\/i18n\//, /\/lib\/mock(More)?\.ts$/, /\/lib\/preview\.ts$/];
const GERMAN = /[äöüÄÖÜß]|\b(der|die|das|und|nicht|mit|für|ist|eine?n?|noch|kein|bitte|wird|werden|oder|auf|beim|dein|deine|Sie|du|von|zum|zur|im|am|als)\b/;
const files = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(d, e.name)) : /\.tsx?$/.test(e.name) && !SKIP.some((r) => r.test(path.join(d, e.name))) ? [path.join(d, e.name)] : []));
let n = 0;
for (const f of files(ROOT)) {
  const src = fs.readFileSync(f, 'utf8');
  const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, f.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  // Nur das erste Argument von tr/N_ ist der Text; weitere Argumente werden eingesetzt und brauchen selbst tr.
  const inTr = (node) => { for (let c = node, p = node.parent; p; c = p, p = p.parent) { if (ts.isCallExpression(p) && ['tr', 'N_'].includes(p.expression.getText(sf))) return p.arguments[0] === c; } return false; };
  const visit = (node) => {
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node) || ts.isJsxText(node)) && GERMAN.test(node.text ?? node.getText(sf)) && !inTr(node) && !ts.isImportDeclaration(node.parent)) {
      const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
      console.log(`${path.relative(ROOT, f)}:${line + 1}  ${(node.text ?? node.getText(sf)).trim().slice(0, 110)}`);
      n++;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}
console.log(`${n} offen`);
