"""Generate UI/public text; optionally finalize a NEW migration seed exactly once."""
import argparse
from pathlib import Path
import hashlib
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
