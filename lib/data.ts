import fs from "node:fs";
import path from "node:path";
import investorsJson from "../data/investors.json";
import { validateInvestors } from "./investors";
import { buildStockIndex, type StockEntry } from "./stocks";
import type { Investor, Portfolio } from "./types";

// Synchronous reads on purpose: with Cache Components, sync I/O is prerendered
// into the static output at build time.
//
// Pages for URLs outside generateStaticParams render on their first request, where
// /data may not be on disk. investors.json is bundled through the import above and
// the other reads return null when a file is missing, so such URLs become a 404.

export const DATA_DIR = path.join(process.cwd(), "data");

export const dataPaths = {
  investors: path.join(DATA_DIR, "investors.json"),
  cusipMap: path.join(DATA_DIR, "cusip-map.json"),
  cusipOverrides: path.join(DATA_DIR, "cusip-overrides.json"),
  filingsRoot: path.join(DATA_DIR, "filings"),
  filingsDir: (cik: string) => path.join(DATA_DIR, "filings", cik),
  filing: (cik: string, quarter: string) => path.join(DATA_DIR, "filings", cik, `${quarter}.json`),
  portfoliosRoot: path.join(DATA_DIR, "portfolios"),
  portfoliosDir: (investorId: string) => path.join(DATA_DIR, "portfolios", investorId),
  portfolio: (investorId: string, quarter: string) =>
    path.join(DATA_DIR, "portfolios", investorId, `${quarter}.json`),
};

export function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

export function readJsonIfExists<T>(file: string): T | null {
  return fs.existsSync(file) ? readJson<T>(file) : null;
}

/** Quarter names ("2026-Q2") of the JSON files in a directory, oldest first. */
export function listQuarters(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d{4}-Q[1-4]\.json$/.test(f))
    .map((f) => f.slice(0, -".json".length))
    .sort();
}

const investors = validateInvestors(investorsJson);

export function loadInvestors(): Investor[] {
  return investors;
}

export function findInvestor(id: string): Investor | null {
  return investors.find((i) => i.id === id) ?? null;
}

/** Quarters with a portfolio file for this investor, oldest first. */
export function listPortfolioQuarters(investorId: string): string[] {
  return listQuarters(dataPaths.portfoliosDir(investorId));
}

export function loadPortfolio(investorId: string, quarter: string): Portfolio | null {
  // Both values can come from a URL: only read paths built from known-safe shapes.
  if (!findInvestor(investorId) || !/^\d{4}-Q[1-4]$/.test(quarter)) return null;
  return readJsonIfExists<Portfolio>(dataPaths.portfolio(investorId, quarter));
}

export function loadLatestPortfolio(investorId: string): Portfolio | null {
  const latest = listPortfolioQuarters(investorId).at(-1);
  return latest ? loadPortfolio(investorId, latest) : null;
}

/** Every investor that has at least one portfolio, with their latest quarter. */
export function loadLatestPortfolios(): { investor: Investor; portfolio: Portfolio }[] {
  return investors.flatMap((investor) => {
    const portfolio = loadLatestPortfolio(investor.id);
    return portfolio ? [{ investor, portfolio }] : [];
  });
}

// Built once per build process: every stock page needs it, and rebuilding it per page
// would re-read every investor's portfolio. Rebuilt on each call in dev so data edits show up.
let stockIndex: StockEntry[] | null = null;

export function loadStockIndex(): StockEntry[] {
  if (process.env.NODE_ENV !== "production") return buildStockIndex(loadLatestPortfolios());
  stockIndex ??= buildStockIndex(loadLatestPortfolios());
  return stockIndex;
}

export function findStock(slug: string): StockEntry | null {
  return loadStockIndex().find((s) => s.slug === slug) ?? null;
}

// ticker -> quarter -> quarter-end price, from every portfolio on file. Same caching as the stock index.
let priceHistory: Map<string, Map<string, number>> | null = null;

function buildPriceHistory(): Map<string, Map<string, number>> {
  const byTicker = new Map<string, Map<string, number>>();
  for (const investor of investors) {
    for (const quarter of listPortfolioQuarters(investor.id)) {
      for (const h of loadPortfolio(investor.id, quarter)?.holdings ?? []) {
        if (!h.ticker || h.price === null) continue;
        const prices = byTicker.get(h.ticker) ?? new Map<string, number>();
        if (!prices.has(quarter)) prices.set(quarter, h.price);
        byTicker.set(h.ticker, prices);
      }
    }
  }
  return byTicker;
}

/** Quarter-end prices implied by 13F filings, newest first. */
export function loadPriceHistory(ticker: string): { quarter: string; price: number }[] {
  const history = process.env.NODE_ENV === "production" ? (priceHistory ??= buildPriceHistory()) : buildPriceHistory();
  return [...(history.get(ticker) ?? [])]
    .map(([quarter, price]) => ({ quarter, price }))
    .sort((a, b) => b.quarter.localeCompare(a.quarter));
}
