import { CategoryId, CATEGORY_IDS } from '../config/categories';
import type { PortfolioPosition } from '../types/state';
import type { ParsedRow } from '../lib/parseExcel';
import type { DateRange } from '../store/filters';

export type InputRow = ParsedRow | PortfolioPosition;

type NormalizedRow = {
	year: number;
	monthKey: string; // YYYY-MM
	master?: CategoryId | string; // accept both
	sub?: string;
	amount: number;
	assetClass?: string;
};

function isParsedRow(row: InputRow): row is ParsedRow {
	return (row as any).year != null && (row as any).master != null;
}

function normalizeRow(row: InputRow): NormalizedRow | null {
	try {
		if (isParsedRow(row)) {
			const month = typeof row.month === 'number' ? String(row.month).padStart(2, '0') : String(row.month).padStart(2, '0');
			return {
				year: Number(row.year),
				monthKey: `${row.year}-${month}`,
				master: row.master,
				sub: row.sub,
				amount: Number(row.amount || 0),
			};
		}
		// PortfolioPosition
		const d = new Date((row as PortfolioPosition).date);
		if (isNaN(d.getTime())) return null;
		const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
		return {
			year: d.getFullYear(),
			monthKey: mk,
			master: (row as PortfolioPosition).category,
			sub: (row as PortfolioPosition).account,
			amount: Number((row as PortfolioPosition).value || 0),
			assetClass: (row as PortfolioPosition).assetClass,
		};
	} catch {
		return null;
	}
}

export type Filters = {
	category?: CategoryId;
	sub?: string;
	dateRange?: DateRange;
};

export function selectFilteredRows(raw: InputRow[], filters: Filters): NormalizedRow[] {
	const normalized = raw.map(normalizeRow).filter(Boolean) as NormalizedRow[];
	const { category, sub, dateRange } = filters || {};

	return normalized.filter((r) => {
		if (category && r.master !== category) return false;
		if (sub && r.sub !== sub) return false;
		if (dateRange && (dateRange.from || dateRange.to)) {
			if (dateRange.from && r.monthKey < dateRange.from.slice(0,7)) return false;
			if (dateRange.to && r.monthKey > dateRange.to.slice(0,7)) return false;
		}
		return true;
	});
}

export function selectChartSeries(raw: InputRow[], filters: Filters): { month: string; value: number }[] {
	const rows = selectFilteredRows(raw, filters);
	const byMonth = new Map<string, number>();
	for (const r of rows) {
		byMonth.set(r.monthKey, (byMonth.get(r.monthKey) || 0) + r.amount);
	}
	return Array.from(byMonth.entries())
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([month, value]) => ({ month, value }));
}

export function selectRightPanelStats(raw: InputRow[], filters: Filters): {
	total: number;
	change: number;
	changePercent: number;
	allocationByCategory: { name: string; value: number }[];
} {
	const rows = selectFilteredRows(raw, filters);
	if (rows.length === 0) {
		return { total: 0, change: 0, changePercent: 0, allocationByCategory: [] };
	}

	// Totals by category for latest month
	const latestMonth = rows.reduce((max, r) => (r.monthKey > max ? r.monthKey : max), rows[0].monthKey);
	const prevMonth = (() => {
		const [y, m] = latestMonth.split('-').map(Number);
		const d = new Date(y, m - 1, 1);
		d.setMonth(d.getMonth() - 1);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
	})();

	let total = 0;
	let prevTotal = 0;
	const catTotals = new Map<string, number>();

	for (const r of rows) {
		if (r.monthKey === latestMonth) {
			total += r.amount;
			const key = String(r.master || 'Other');
			catTotals.set(key, (catTotals.get(key) || 0) + r.amount);
		}
		if (r.monthKey === prevMonth) prevTotal += r.amount;
	}

	const change = total - prevTotal;
	const changePercent = prevTotal ? (change / prevTotal) * 100 : 0;

	const allocationByCategory = Array.from(catTotals.entries())
		.map(([name, value]) => ({ name, value }))
		.sort((a, b) => b.value - a.value);

	return { total, change, changePercent, allocationByCategory };
}

// Unique available subs for optional category
export function selectAvailableSubs(raw: InputRow[], category?: CategoryId): string[] {
	const rows = selectFilteredRows(raw, { category, sub: undefined, dateRange: undefined });
	const subs = new Set<string>();
	for (const r of rows) {
		if (r.sub) subs.add(r.sub);
	}
	return Array.from(subs).sort();
}

// ===== Latest month helpers for category totals (ParsedRow-based) =====
export type YearMonth = { year: number; month: number };

export function getLatestYearMonth(rows: ParsedRow[]): YearMonth | undefined {
	let best: YearMonth | undefined;
	for (const r of rows) {
		const y = Number(r.year);
		const m = typeof r.month === 'number' ? r.month : parseInt(String(r.month), 10);
		if (!y || !m || m < 1 || m > 12) continue;
		if (!best) best = { year: y, month: m };
		else if (y > best.year || (y === best.year && m > best.month)) best = { year: y, month: m };
	}
	return best;
}

export function filterRowsByYearMonth(rows: ParsedRow[], ym: YearMonth): ParsedRow[] {
	return rows.filter(r => {
		const y = Number(r.year);
		const m = typeof r.month === 'number' ? r.month : parseInt(String(r.month), 10);
		return y === ym.year && m === ym.month;
	});
}

export function aggregateTotalsByMonth(rows: ParsedRow[], ym: YearMonth): Record<CategoryId, number> {
	const totals = Object.fromEntries(CATEGORY_IDS.map(id => [id, 0])) as Record<CategoryId, number>;
	const monthRows = filterRowsByYearMonth(rows, ym);
	for (const r of monthRows) {
		const cat = (r.master as CategoryId) || ('alternatives' as CategoryId);
		const val = Number(r.amount || 0);
		if (Number.isFinite(val)) totals[cat] = (totals[cat] || 0) + val;
	}
	return totals;
}

export function sumNetWorth(totals: Record<CategoryId, number>): number {
	return CATEGORY_IDS.reduce((sum, id) => sum + (Number(totals[id as CategoryId]) || 0), 0);
}

// ===== Search helpers (categories + subs) =====
export function normalize(input: string): string {
  if (!input) return '';
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildSubIndex(rows: ParsedRow[]): Map<string, Set<CategoryId>> {
  const index = new Map<string, Set<CategoryId>>();
  for (const r of rows) {
    const label = (r.sub || '').toString().trim();
    if (!label) continue;
    const norm = normalize(label);
    if (!norm) continue;
    if (!index.has(label)) index.set(label, new Set<CategoryId>());
    index.get(label)!.add(r.master as CategoryId);
  }
  return index;
}

// Unique subs for a given category (ParsedRow[] version - pure)
export function uniqueSubsForCategory(rows: ParsedRow[], category?: CategoryId): string[] {
  if (!Array.isArray(rows) || rows.length === 0 || !category) return [];
  const set = new Set<string>();
  for (const r of rows) {
    if (r && (r.master as CategoryId) === category) {
      const s = (r.sub ?? '').toString().trim();
      if (s) set.add(s);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

// Convenience for current app data shape (PortfolioPosition[])
export function uniqueSubsForCategoryInput(rows: InputRow[], category?: CategoryId): string[] {
  if (!category) return [];
  const filtered = selectFilteredRows(rows as any[], { category, sub: undefined, dateRange: undefined });
  const set = new Set<string>();
  for (const r of filtered) {
    const s = (r.sub ?? '').toString().trim();
    if (s) set.add(s);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
