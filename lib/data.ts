import fs from "node:fs";
import path from "node:path";
import { validateInvestors } from "./investors";
import type { Investor, Portfolio } from "./types";

// Synchronous reads on purpose: with Cache Components, sync I/O is prerendered
// into the static output at build time.

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

export function loadInvestors(): Investor[] {
  return validateInvestors(readJson(dataPaths.investors));
}

export function loadLatestPortfolio(investorId: string): Portfolio | null {
  const quarters = listQuarters(dataPaths.portfoliosDir(investorId));
  const latest = quarters.at(-1);
  return latest ? readJson<Portfolio>(dataPaths.portfolio(investorId, latest)) : null;
}
