import { changeLookup } from "./portfolio";
import type { Change, Investor, Portfolio, PutCall } from "./types";

export interface StockHolder {
  investorId: string;
  investorName: string;
  fund: string;
  quarter: string;
  name: string;
  putCall: PutCall | null;
  shares: number;
  value: number;
  /** Share of the investor's portfolio; null for options. */
  weight: number | null;
  /** Change vs. the investor's previous quarter; null when unchanged or unknown. */
  change: Change | null;
  /** False when the investor's previous quarter is not on file (change is unknown). */
  hasPrevious: boolean;
}

export interface StockExit {
  investorId: string;
  investorName: string;
  fund: string;
  quarter: string;
  putCall: PutCall | null;
  prevShares: number;
}

export interface StockEntry {
  ticker: string;
  slug: string;
  name: string;
  /** Sorted by value, largest first. */
  holders: StockHolder[];
  /** Investors whose latest quarter sold the whole position. */
  exits: StockExit[];
  /** Distinct investors holding shares (not only options). */
  holderCount: number;
  /** Sum of share positions across investors, in US dollars. */
  totalValue: number;
}

/**
 * Rows an investor page shows. Quant and macro funds report thousands of positions;
 * rendering all of them made pages of several MB.
 */
export const DISPLAY_LIMITS = { shares: 100, options: 50, exits: 60 } as const;

/**
 * Stocks that get their own page: held by at least two investors, or shown on some
 * investor's latest page (so every link there works). Leaves out the long tail of
 * single positions deep in a quant fund's portfolio, about 40% of all tickers.
 */
export function selectStockPages(
  index: StockEntry[],
  latest: { portfolio: Portfolio }[],
): StockEntry[] {
  const shown = new Set<string>();
  for (const { portfolio } of latest) {
    const shares = portfolio.holdings.filter((h) => !h.putCall).slice(0, DISPLAY_LIMITS.shares);
    const options = portfolio.holdings.filter((h) => h.putCall).slice(0, DISPLAY_LIMITS.options);
    const exits = (portfolio.changes ?? []).filter((c) => c.action === "exit").slice(0, DISPLAY_LIMITS.exits);
    for (const { ticker } of [...shares, ...options, ...exits]) if (ticker) shown.add(ticker);
  }
  return index.filter((s) => s.holderCount >= 2 || shown.has(s.ticker));
}

/** URL segment for a ticker: "BRK.B" -> "brk-b". */
export function tickerSlug(ticker: string): string {
  return ticker.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/**
 * Groups the latest portfolio of every investor by ticker.
 * Positions without a ticker are left out because they cannot have a page.
 */
export function buildStockIndex(items: { investor: Investor; portfolio: Portfolio }[]): StockEntry[] {
  const entries = new Map<string, StockEntry>();
  const entryFor = (ticker: string, name: string) => {
    let entry = entries.get(ticker);
    if (!entry) {
      entry = { ticker, slug: tickerSlug(ticker), name, holders: [], exits: [], holderCount: 0, totalValue: 0 };
      entries.set(ticker, entry);
    }
    return entry;
  };

  for (const { investor, portfolio } of items) {
    const changeOf = changeLookup(portfolio.changes);
    const who = { investorId: investor.id, investorName: investor.name, fund: investor.fund, quarter: portfolio.quarter };

    for (const h of portfolio.holdings) {
      if (!h.ticker) continue;
      entryFor(h.ticker, h.name).holders.push({
        ...who,
        name: h.name,
        putCall: h.putCall,
        shares: h.shares,
        value: h.value,
        weight: h.weight,
        change: changeOf(h),
        hasPrevious: portfolio.changes !== null,
      });
    }
    for (const c of portfolio.changes ?? []) {
      if (c.action !== "exit" || !c.ticker) continue;
      entryFor(c.ticker, c.name).exits.push({ ...who, putCall: c.putCall, prevShares: c.prevShares });
    }
  }

  for (const entry of entries.values()) {
    entry.holders.sort((a, b) => b.value - a.value);
    const shareHolders = entry.holders.filter((h) => !h.putCall);
    entry.holderCount = new Set(shareHolders.map((h) => h.investorId)).size;
    entry.totalValue = shareHolders.reduce((sum, h) => sum + h.value, 0);
  }

  return [...entries.values()].sort(
    (a, b) => b.holderCount - a.holderCount || b.totalValue - a.totalValue || a.ticker.localeCompare(b.ticker),
  );
}
