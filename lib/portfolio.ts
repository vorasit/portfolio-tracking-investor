import { aggregatePositions } from "./thirteenf";
import type { Change, ChangeAction, CikQuarter, Holding, Portfolio, Position } from "./types";

/** "2026-06-30" -> "2026-Q2". Throws for dates that are not calendar quarter ends. */
export function quarterOf(period: string): string {
  const match = /^(\d{4})-(03-31|06-30|09-30|12-31)$/.exec(period);
  if (!match) throw new Error(`Not a calendar quarter end: ${period}`);
  const q = { "03-31": 1, "06-30": 2, "09-30": 3, "12-31": 4 }[match[2]]!;
  return `${match[1]}-Q${q}`;
}

/** "2026-Q1" -> "2025-Q4" */
export function previousQuarter(quarter: string): string {
  const [year, q] = quarter.split("-Q").map(Number);
  return q === 1 ? `${year - 1}-Q4` : `${year}-Q${q - 1}`;
}

export type TickerLookup = (cusip: string) => string | null;

/** Merges the per-CIK files of one investor for one quarter. */
export function buildPortfolio(
  investorId: string,
  parts: CikQuarter[],
  tickerOf: TickerLookup,
): Omit<Portfolio, "changes"> {
  if (parts.length === 0) throw new Error(`buildPortfolio(${investorId}): no filings`);
  const { period, quarter } = parts[0];

  const filings = parts
    .flatMap((p) => p.filings)
    .sort((a, b) => a.filedAt.localeCompare(b.filedAt) || a.accession.localeCompare(b.accession));
  const positions = aggregatePositions(parts.flatMap((p) => p.positions));
  const totalValue = positions.filter((p) => !p.putCall).reduce((sum, p) => sum + p.value, 0);

  const holdings: Holding[] = positions.map((p) => ({
    ...p,
    ticker: tickerOf(p.cusip),
    weight: p.putCall || totalValue === 0 ? null : round(p.value / totalValue, 6),
  }));

  return {
    investorId,
    period,
    quarter,
    filedAt: filings[filings.length - 1].filedAt,
    filings,
    totalValue,
    holdings,
  };
}

const ACTION_ORDER: Record<ChangeAction, number> = { new: 0, add: 1, reduce: 2, exit: 3 };

function changeKey(p: Pick<Position, "cusip" | "putCall" | "shareType">): string {
  return `${p.cusip}|${p.putCall ?? ""}|${p.shareType}`;
}

/** Compares two consecutive quarters by share count. Unchanged positions are omitted. */
export function diffHoldings(prev: Holding[], curr: Holding[]): Change[] {
  const prevByKey = new Map(prev.map((h) => [changeKey(h), h]));
  const currByKey = new Map(curr.map((h) => [changeKey(h), h]));
  // Paired with the position value (current, or previous for exits) for sorting.
  const changes: [Change, number][] = [];

  for (const [key, h] of currByKey) {
    const before = prevByKey.get(key);
    const prevShares = before?.shares ?? 0;
    if (h.shares === prevShares) continue;
    const action: ChangeAction = !before ? "new" : h.shares > prevShares ? "add" : "reduce";
    changes.push([toChange(h, action, h.shares, prevShares), h.value]);
  }
  for (const [key, h] of prevByKey) {
    if (currByKey.has(key)) continue;
    changes.push([toChange(h, "exit", 0, h.shares), h.value]);
  }

  return changes
    .sort(
      ([a, aValue], [b, bValue]) =>
        ACTION_ORDER[a.action] - ACTION_ORDER[b.action] || bValue - aValue || a.cusip.localeCompare(b.cusip),
    )
    .map(([change]) => change);
}

function toChange(h: Holding, action: ChangeAction, shares: number, prevShares: number): Change {
  return { cusip: h.cusip, ticker: h.ticker, name: h.name, putCall: h.putCall, action, shares, prevShares };
}

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
