import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { CATEGORIES, CategoryId } from '../config/categories';
import { useDataStore } from '../store/dataStore';
import { buildSubIndex, normalize } from '../selectors/portfolio';

export type Suggestion =
  | { kind: 'category'; id: CategoryId; label: string; emoji?: string }
  | { kind: 'sub'; label: string; masters: CategoryId[] };

export type AutocompleteSearchProps = {
  value: string;
  onChange: (v: string) => void;
  onPick: (s: Suggestion) => void;
  placeholder?: string;
  className?: string;
};

const MAX_RESULTS = 10;

export default function AutocompleteSearch({ value, onChange, onPick, placeholder = 'Search...', className = '' }: AutocompleteSearchProps) {
  const raw = useDataStore().raw as any[];

  // Build suggestion index from categories + subs
  const suggestions = useMemo<Suggestion[]>(() => {
    // Categories
    const cats: Suggestion[] = CATEGORIES.map(c => ({ kind: 'category', id: c.id, label: c.label, emoji: c.emoji }));

    // Subs from raw -> use account as sub label in current model
    const uniqueSubs = new Map<string, Set<CategoryId>>();
    for (const r of raw) {
      const sub = (r.account || '').toString().trim();
      if (!sub) continue;
      if (!uniqueSubs.has(sub)) uniqueSubs.set(sub, new Set<CategoryId>());
      uniqueSubs.get(sub)!.add((r.category as CategoryId) || 'alternatives');
    }

    const subs: Suggestion[] = Array.from(uniqueSubs.entries()).map(([label, masters]) => ({
      kind: 'sub',
      label,
      masters: Array.from(masters),
    }));

    return [...cats, ...subs];
  }, [raw]);

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const listRef = useRef<HTMLUListElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(() => {
    const q = normalize(value);
    if (!q) return suggestions.slice(0, MAX_RESULTS);

    const scored = suggestions
      .map(s => {
        const label = 'label' in s ? s.label : '';
        const norm = normalize(label);
        let score = -1;
        if (norm.startsWith(q)) score = 2;
        else if (norm.includes(q)) score = 1;
        return { s, score };
      })
      .filter(x => x.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS)
      .map(x => x.s);

    return scored;
  }, [value, suggestions]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => (i + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => (i - 1 + Math.max(1, filtered.length)) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[activeIndex]) {
        onPick(filtered[activeIndex]);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }, [filtered, activeIndex, open, onPick]);

  useEffect(() => {
    if (!open) setActiveIndex(-1);
  }, [open, value]);

  return (
    <div className={"autocomplete " + className} style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls="autocomplete-listbox"
        placeholder={placeholder}
        className="search-input"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />

      {open && filtered.length > 0 && (
        <ul
          id="autocomplete-listbox"
          role="listbox"
          ref={listRef}
          className="autocomplete-list"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 2000,
            background: 'rgba(255,255,255,0.95)',
            borderRadius: 8,
            marginTop: 6,
            padding: 6,
            maxHeight: 280,
            overflowY: 'auto',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}
        >
          {filtered.map((s, idx) => (
            <li
              key={(s.kind === 'category' ? 'cat:' + s.id : 'sub:' + s.label)}
              role="option"
              aria-selected={idx === activeIndex}
              className={"autocomplete-item"}
              style={{
                padding: '8px 10px',
                borderRadius: 6,
                cursor: 'pointer',
                background: idx === activeIndex ? 'rgba(0,0,0,0.06)' : 'transparent',
                color: '#111827'
              }}
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseDown={(e) => { e.preventDefault(); onPick(s); setOpen(false); }}
            >
              {s.kind === 'category' ? (
                <span>{(CATEGORIES.find(c => c.id === s.id)?.emoji || '') + ' '}{s.label}</span>
              ) : (
                <span>
                  {s.label}
                  {s.masters.length > 0 && (
                    <span style={{ marginLeft: 8, fontSize: 12, color: '#6b7280' }}>
                      — [{s.masters.join(', ')}]
                    </span>
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
