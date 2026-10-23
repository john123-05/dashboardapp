#!/usr/bin/env node
// Sammelt alle Texte aus tr('…') und N_('…') (erstes Argument) als JSON-Liste auf stdout.
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const ROOT = path.join(__dirname, '..', 'src');
const files = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === 'i18n' ? [] : files(path.join(d, e.name))) : /\.tsx?$/.test(e.name) ? [path.join(d, e.name)] : []));
const keys = new Set();
for (const f of files(ROOT)) {
  const sf = ts.createSourceFile(f, fs.readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true, f.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const visit = (n) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && ['tr', 'N_'].includes(n.expression.text)) {
      const a = n.arguments[0];
      if (a && (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a))) keys.add(a.text);
      else if (a && !(ts.isIdentifier(a) || ts.isPropertyAccessExpression(a) || ts.isElementAccessExpression(a))) console.error('dynamisch:', path.relative(ROOT, f), a.getText(sf).slice(0, 60));
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}
console.log(JSON.stringify([...keys].sort(), null, 1));
