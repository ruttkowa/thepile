import type { PileCard } from './types';

export type ExportFormat = 'text' | 'csv' | 'json';

export interface ExportAttr {
  key: string;
  label: string;
  get: (c: PileCard) => string | number | null;
}

export const EXPORT_ATTRS: ExportAttr[] = [
  { key: 'name', label: 'Name', get: (c) => c.name },
  { key: 'set', label: 'Set code', get: (c) => c.set },
  { key: 'set_name', label: 'Set name', get: (c) => c.set_name },
  { key: 'collector_number', label: 'Collector #', get: (c) => c.collector_number },
  { key: 'rarity', label: 'Rarity', get: (c) => c.rarity },
  { key: 'mana_cost', label: 'Mana cost', get: (c) => c.mana_cost },
  { key: 'cmc', label: 'Mana value', get: (c) => c.cmc },
  { key: 'type_line', label: 'Type', get: (c) => c.type_line },
  { key: 'colors', label: 'Colors', get: (c) => c.colors.join('') },
  { key: 'oracle_text', label: 'Oracle text', get: (c) => c.oracle_text },
  { key: 'usd', label: 'Price (USD)', get: (c) => c.usd },
  { key: 'eur', label: 'Price (EUR)', get: (c) => c.eur },
  { key: 'scryfall_uri', label: 'Scryfall link', get: (c) => c.scryfall_uri },
];

export const DEFAULT_ATTRS = ['name'];

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function buildExport(
  cards: PileCard[],
  format: ExportFormat,
  attrKeys: string[]
): string {
  const attrs = EXPORT_ATTRS.filter((a) => attrKeys.includes(a.key));
  switch (format) {
    case 'text':
      return cards
        .map((c) =>
          attrs
            .map((a) => String(a.get(c) ?? '').replace(/\n/g, ' '))
            .join('\t')
        )
        .join('\n');
    case 'csv': {
      const header = attrs.map((a) => a.key).join(',');
      const rows = cards.map((c) =>
        attrs.map((a) => csvEscape(String(a.get(c) ?? ''))).join(',')
      );
      return [header, ...rows].join('\n');
    }
    case 'json':
      return JSON.stringify(
        cards.map((c) => Object.fromEntries(attrs.map((a) => [a.key, a.get(c)]))),
        null,
        2
      );
  }
}

export function exportFilename(pileName: string, format: ExportFormat): string {
  const safe = pileName.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'pile';
  const date = new Date().toISOString().slice(0, 10);
  const ext = format === 'text' ? 'txt' : format;
  return `${safe}-${date}.${ext}`;
}

export function downloadText(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
