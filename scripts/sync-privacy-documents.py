"""Generate UI/public text; optionally finalize a NEW migration seed exactly once."""
import argparse
from pathlib import Path
import hashlib
import html
import json
import re

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--migration', type=Path, help='New migration containing -- PRIVACY_VERSION_SEED; never an archived seed')
args = parser.parse_args()
constants = (root / 'src/constants/privacy.ts').read_text()
version = re.search(r"PRIVACY_VERSION = '([^']+)'", constants).group(1)
source = root / f'docs/legal/privacy-{version}.md'
policy = source.read_text()
digest = hashlib.sha256(policy.encode()).hexdigest()
public = root / 'public/legal'
destination = public / f'privacy-{version}.md'
if destination.exists() and destination.read_text() != policy:
    raise SystemExit('Public archive differs: create a new privacy version instead of rewriting its snapshot.')
migration = (root / args.migration).resolve() if args.migration else None
if migration:
    if migration.parent != root / 'supabase/migrations':
        raise SystemExit('Migration must be inside supabase/migrations.')
    migration_text = migration.read_text()
    if migration_text.count('-- PRIVACY_VERSION_SEED') != 1 or '-- BEGIN PRIVACY VERSION' in migration_text:
        raise SystemExit('Only a NEW, unseeded migration may be finalized. Archived migrations are never rewritten.')


def constant(name):
    return re.search(rf"export const {name} =\s*'([^']*)';", constants).group(1)


sections = []
for title, content in re.findall(r'^## ([^\n]+)\n(.*?)(?=^## |\Z)', policy, re.M | re.S):
    paragraphs = []
    for part in re.split(r'\n\s*\n', content.strip()):
        if part.startswith('|'):
            for row in part.splitlines()[2:]:
                cells = [cell.strip() for cell in row.strip('|').split('|')]
                paragraphs.append('**' + cells[0] + ':** ' + cells[1])
        elif part.startswith('- '):
            paragraphs.extend('• ' + line.removeprefix('- ') for line in part.splitlines())
        else:
            paragraphs.append(part)
    sections.append({'title': title, 'paragraphs': paragraphs})

(root / 'src/constants/privacy-policy.json').write_text(json.dumps({
    'version': version, 'sha256': digest, 'sections': sections,
}, ensure_ascii=False, indent=2) + '\n')
public.mkdir(parents=True, exist_ok=True)
destination.write_text(policy)

# A script-free, printable reading copy. Only presentation changes here;
# the canonical Markdown and database snapshot retain their original hash.
def inline_html(value):
    value = html.escape(value)
    value = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', value)
    return re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', value)


contents = '<nav aria-label="Inhaltsverzeichnis"><h2>Inhaltsverzeichnis</h2><ul>' + ''.join(
    f'<li><a href="#abschnitt-{index}">{html.escape(section["title"])}</a></li>'
    for index, section in enumerate(sections, 1)) + '</ul></nav>'
body = []
for index, section in enumerate(sections, 1):
    paragraphs = section['paragraphs']
    rendered = []
    in_list = False
    for paragraph in paragraphs:
        bullet = paragraph.startswith('• ')
        if bullet and not in_list:
            rendered.append('<ul>')
        if not bullet and in_list:
            rendered.append('</ul>')
        tag = 'li' if bullet else 'p'
        rendered.append(f'<{tag}>' + inline_html(paragraph[2:] if bullet else paragraph) + f'</{tag}>')
        in_list = bullet
    if in_list:
        rendered.append('</ul>')
    body.append(f'<section><h2 id="abschnitt-{index}">{html.escape(section["title"])}</h2>' + ''.join(rendered) + '</section>')
date = re.search(r'\*\*Stand: ([^*]+)\*\*', policy).group(1)
printable = '''<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Datenschutzerklärung – Islam-Kinderakademie</title>
<style>body{font:1rem/1.65 system-ui,sans-serif;color:#173D3A;max-width:72ch;margin:2rem auto;padding:0 1rem;overflow-wrap:anywhere}h1{font-size:clamp(1.6rem,5vw,2.15rem);line-height:1.3}h2{font-size:1.35rem;line-height:1.4;margin-top:2rem}p{white-space:pre-line}a{color:#1E5B52;text-underline-offset:.15em}a:focus-visible{outline:3px solid #1E5B52;outline-offset:3px}li{margin:.4rem 0}@media print{nav,.online-settings{display:none}h2{break-after:avoid}body{margin:0;max-width:none}}</style></head><body>
<h1>Datenschutzerklärung</h1>'''
printable += '<p>Stand: ' + html.escape(date) + '</p>'
printable += '<p class="online-settings"><a href="https://www.bufib-kinder.de/datenschutz#hcaptcha-einstellungen">Zu den hCaptcha-Einstellungen und zum Widerruf auf der Website</a></p>'
printable += contents + '<main>' + ''.join(body) + '</main></body></html>\n'
(public / f'privacy-{version}.html').write_text(printable)


def sql(value):
    return "'" + value.replace("'", "''") + "'"


if migration:
    values = [version, digest, policy, constant('GUARDIAN_CONSENT_TEXT'),
              constant('CHILD_DATA_CONSENT_TEXT'), constant('RECORDING_CONSENT_TEXT'), constant('CAPTCHA_CONSENT_TEXT')]
    statement = ('insert into public.privacy_document_versions '
                 '(version, policy_sha256, policy_text, guardian_text, child_data_text, recording_text, captcha_text)\nvalues ('
                 + ',\n'.join(sql(value) for value in values) + ');')
    migration.write_text(migration_text.replace('-- PRIVACY_VERSION_SEED', '-- BEGIN PRIVACY VERSION\n' + statement + '\n-- END PRIVACY VERSION'))
print(f'Privacy {version}: {len(sections)} sections, SHA-256 {digest}')
