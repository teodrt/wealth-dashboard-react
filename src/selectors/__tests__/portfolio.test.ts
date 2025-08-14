import { getLatestYearMonth, aggregateTotalsByMonth, sumNetWorth, filterRowsByYearMonth } from '../../selectors/portfolio';
import type { ParsedRow } from '../../lib/parseExcel';

describe('portfolio selectors - latest month totals', () => {
  const rows: ParsedRow[] = [
    { year: 2024, month: 1, master: 'real_estate', sub: 'A', amount: 100 },
    { year: 2024, month: 1, master: 'fixed_income', sub: 'Bonds', amount: 50 },
    { year: 2024, month: 2, master: 'real_estate', sub: 'A', amount: 120 },
    { year: 2024, month: 2, master: 'fixed_income', sub: 'Bonds', amount: 80 },
  ];

  it('getLatestYearMonth returns max (year,month)', () => {
    const ym = getLatestYearMonth(rows)!;
    expect(ym).toEqual({ year: 2024, month: 2 });
  });

  it('filterRowsByYearMonth filters correctly', () => {
    const ym = { year: 2024, month: 1 };
    const out = filterRowsByYearMonth(rows, ym);
    expect(out.length).toBe(2);
    expect(out.every(r => r.year === 2024)).toBe(true);
  });

  it('aggregateTotalsByMonth aggregates per category for target month', () => {
    const ym = { year: 2024, month: 2 };
    const totals = aggregateTotalsByMonth(rows, ym);
    expect(totals.real_estate).toBe(120);
    expect(totals.fixed_income).toBe(80);
  });

  it('sumNetWorth sums totals', () => {
    const ym = { year: 2024, month: 2 };
    const totals = aggregateTotalsByMonth(rows, ym);
    const nw = sumNetWorth(totals);
    expect(nw).toBe(200);
  });
});


