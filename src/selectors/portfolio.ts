import { CategoryId } from '../config/categories';
import type { ParsedRow } from '../lib/parseExcel';
import type { PortfolioPosition } from '../types/state';
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
