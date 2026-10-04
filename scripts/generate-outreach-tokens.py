#!/usr/bin/env python3
"""Generate private recipient records and links outside the published website."""
import argparse
import csv
import os
from pathlib import Path
import secrets
from urllib.parse import urlencode

FIELDS = ['restaurant', 'contact_name', 'title', 'email', 'phone',
          'ordering_system', 'pos_evidence', 'track', 'segment']
SITE_ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('recipients', type=Path)
    parser.add_argument('--out-dir', required=True, type=Path,
                        help='New private batch directory outside the website')
    args = parser.parse_args()
    output = args.out_dir.resolve()
    source = args.recipients.resolve()
    if output == SITE_ROOT or SITE_ROOT in output.parents:
        parser.error('Private output must be outside the published website directory.')
    if source == SITE_ROOT or SITE_ROOT in source.parents:
        parser.error('Recipient CSV must be outside the published website directory.')
    with source.open(encoding='utf-8-sig', newline='') as stream:
        reader = csv.DictReader(stream)
        if not {'restaurant', 'email'}.issubset(reader.fieldnames or []):
            parser.error('CSV must include restaurant and email columns.')
        rows = list(reader)
    if not rows or any(not r.get('restaurant', '').strip() or not r.get('email', '').strip() for r in rows):
        parser.error('Every recipient must have a restaurant and email.')
    if output.exists():
        parser.error('Output directory already exists; choose a new batch directory to preserve previous tokens.')
    os.umask(0o077)
    output.mkdir(parents=True, mode=0o700)
    with (output / 'lead-tokens.csv').open('x', newline='', encoding='utf-8') as records, \
         (output / 'links.txt').open('x', encoding='utf-8') as links:
        writer = csv.DictWriter(records, fieldnames=['token'] + FIELDS)
        writer.writeheader()
        for row in rows:
            token = secrets.token_hex(16)
            writer.writerow({'token': token, **{f: row.get(f, '') for f in FIELDS}})
            url = 'https://serviio.ai/interested.html?' + urlencode({
                't': token, 'r': row['restaurant'], 's': row.get('ordering_system', '')})
            links.write(f"{row['restaurant']} <{row['email']}>\n{url}\n\n")
    print(f'Generated {len(rows)} recipient links in {output}. Keep both files private and preserve the mapping.')


if __name__ == '__main__':
    main()
