import { useMemo, useState } from 'react';
import type { Pile } from '../types';
import {
  buildExport,
  DEFAULT_ATTRS,
  downloadText,
  EXPORT_ATTRS,
  exportFilename,
  type ExportFormat,
} from '../export';

const PREFS_KEY = 'thepile:export:v1';

interface Prefs {
  format: ExportFormat;
  attrs: string[];
}

function loadPrefs(): Prefs {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null');
    if (p && p.format && Array.isArray(p.attrs)) return p;
  } catch {
    /* use defaults */
  }
  return { format: 'text', attrs: [...DEFAULT_ATTRS] };
}

const MIME: Record<ExportFormat, string> = {
  text: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
};

export function ExportModal({ pile, onClose }: { pile: Pile; onClose: () => void }) {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [copied, setCopied] = useState(false);

  const update = (next: Prefs) => {
    setPrefs(next);
    setCopied(false);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      /* non-fatal */
    }
  };

  const toggleAttr = (key: string) => {
    if (key === 'name') return; // name is always exported
    const attrs = prefs.attrs.includes(key)
      ? prefs.attrs.filter((a) => a !== key)
      : [...prefs.attrs, key];
    update({ ...prefs, attrs });
  };

  const content = useMemo(
    () => buildExport(pile.cards, prefs.format, ['name', ...prefs.attrs]),
    [pile.cards, prefs]
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — user can still download */
    }
  };

  const download = () => {
    downloadText(content, exportFilename(pile.name, prefs.format), MIME[prefs.format]);
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet sheet-tall" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h2 className="sheet-title">
          Export “{pile.name}” <span className="sheet-subtitle">({pile.cards.length} cards)</span>
        </h2>

        <div className="segmented export-formats">
          {(['text', 'csv', 'json'] as const).map((f) => (
            <button
              key={f}
              className={prefs.format === f ? 'on' : ''}
              onClick={() => update({ ...prefs, format: f })}
            >
              {f === 'text' ? 'Plain text' : f.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="export-attrs">
          {EXPORT_ATTRS.map((a) => (
            <label key={a.key} className={`attr-check ${a.key === 'name' ? 'locked' : ''}`}>
              <input
                type="checkbox"
                checked={a.key === 'name' || prefs.attrs.includes(a.key)}
                disabled={a.key === 'name'}
                onChange={() => toggleAttr(a.key)}
              />
              {a.label}
            </label>
          ))}
        </div>

        <pre className="export-preview">
          {content.split('\n').slice(0, 8).join('\n')}
          {content.split('\n').length > 8 ? '\n…' : ''}
        </pre>

        <div className="export-actions">
          <button className="btn btn-secondary" onClick={copy}>
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
          <button className="btn btn-primary" onClick={download}>
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
