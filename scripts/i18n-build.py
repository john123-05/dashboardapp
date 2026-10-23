#!/usr/bin/env python3
"""Baut src/i18n/{en,es,fr,it,nl,lv}.ts aus den tr()-Texten der App.

Quellen: die Web-Übersetzungen (gleicher deutscher Text in dashboard2/src/lib/locales) und
eigene Übersetzungen in scripts/i18n-own.json {"deutscher Text": [en, es, fr, it, nl, lv]}.
Neue Texte: in i18n-own.json ergänzen, dann
  node scripts/i18n-keys.js > /tmp/keys.json
  node scripts/i18n-web.js /tmp/keys.json > /tmp/web.json
  python3 scripts/i18n-build.py /tmp/keys.json /tmp/web.json scripts/i18n-own.json
"""
import json, re, sys

LANGS = ['en', 'es', 'fr', 'it', 'nl', 'lv']
keys = json.load(open(sys.argv[1]))
web = json.load(open(sys.argv[2]))
own = {}
for f in sys.argv[3:]:
    own.update(json.load(open(f)))

def dev(k):  # Entwickler-Meldungen bleiben deutsch/englisch
    return k in ('HTTP {0}', 'Missing session') or k.startswith('Keine Antwort von kiosk') or 'außerhalb von' in k

missing = [k for k in keys if k not in web and k not in own and not dev(k)]
for k in missing:
    print('fehlt:', k)
for i, lang in enumerate(LANGS):
    out = {}
    for k in keys:
        if dev(k):
            continue
        v = own[k][i] if k in own else web.get(k, {}).get(lang)
        if v is None:
            continue
        if sorted(re.findall(r'\{\d\}', k)) != sorted(re.findall(r'\{\d\}', v)):
            print('Platzhalter passt nicht:', lang, k)
        out[k] = v
    body = '\n'.join(f'  {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)},' for k, v in out.items())
    with open(f'src/i18n/{lang}.ts', 'w') as fh:
        fh.write('// Erzeugt mit scripts/i18n-build.py – Schlüssel ist der deutsche Text aus tr(…).\n'
                 f'const dict: Record<string, string> = {{\n{body}\n}};\nexport default dict;\n')
print(f'{len(keys)} Texte, {len(missing)} ohne Übersetzung')
