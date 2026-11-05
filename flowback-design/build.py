#!/usr/bin/env python3
"""Bundle the Flowback Report design boards into one standalone test page.

Reads the canvas board files (.dc.html), pulls each one's template and logic,
and writes a single self-contained HTML file with a tiny renderer that plays
them the same way the design canvas does.
"""
import json, re, sys, pathlib

SRC = pathlib.Path(sys.argv[1])
OUT = pathlib.Path(sys.argv[2])

BOARDS = ['Wizard', 'Phone', 'PadMap', 'Icon', 'Foreman', 'Engineer', 'EngSetup']

comps = {}
for name in BOARDS:
    t = (SRC / f'{name}.dc.html').read_text(encoding='utf-8')
    body = t.split('<x-dc>', 1)[1].split('</x-dc>', 1)[0]
    body = re.sub(r'<helmet>.*?</helmet>', '', body, flags=re.S).strip()
    m = re.search(r'<script type="text/x-dc" data-dc-script[^>]*>(.*?)</script>', t, flags=re.S)
    comps[name] = {'tpl': body, 'js': m.group(1)}

shell = (pathlib.Path(__file__).parent / 'shell.html').read_text(encoding='utf-8')
parts = []
for name, c in comps.items():
    parts.append(f'<template id="tpl-{name}">{c["tpl"]}</template>')
    js = c['js'].replace('</script', '<\\/script')
    parts.append(f'<script>DC.define({json.dumps(name)}, function(DCLogic){{\n{js}\nreturn Component;\n}});</script>')
OUT.write_text(shell.replace('<!--BOARDS-->', '\n'.join(parts)), encoding='utf-8')
print('wrote', OUT, OUT.stat().st_size, 'bytes')
