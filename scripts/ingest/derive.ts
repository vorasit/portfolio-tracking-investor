import fs from "node:fs";
import path from "node:path";
import { dataPaths, listQuarters, readJson, readJsonIfExists } from "../../lib/data";
import { buildPortfolio, buildPriceIndex, diffHoldings, previousQuarter } from "../../lib/portfolio";
import type { CikQuarter, CusipMap, Investor, Portfolio } from "../../lib/types";
import { writeJsonIfChanged } from "./store";

/** Ticker lookup: manual overrides win over OpenFIGI results. */
export function loadTickerLookup(): (cusip: string) => string | null {
  const map = readJsonIfExists<CusipMap>(dataPaths.cusipMap) ?? {};
  const overrides = readJsonIfExists<Record<string, string | null>>(dataPaths.cusipOverrides) ?? {};
  return (cusip) => (cusip in overrides ? overrides[cusip] : (map[cusip]?.ticker ?? null));
}

/** Every data/filings/{cik}/{quarter}.json, grouped by CIK. */
function loadAllFilings(): Map<string, CikQuarter[]> {
  const byCik = new Map<string, CikQuarter[]>();
  if (!fs.existsSync(dataPaths.filingsRoot)) return byCik;
  for (const cik of fs.readdirSync(dataPaths.filingsRoot)) {
    byCik.set(
      cik,
      listQuarters(dataPaths.filingsDir(cik)).map((quarter) => readJson<CikQuarter>(dataPaths.filing(cik, quarter))),
    );
  }
  return byCik;
}

/**
 * Rebuilds data/portfolios from data/filings without any network access:
 * merges each investor's CIKs per quarter, resolves tickers and quarter-end prices,
 * and diffs consecutive quarters. Returns the paths it wrote or removed.
 */
export function derivePortfolios(investors: Investor[]): string[] {
  const tickerOf = loadTickerLookup();
  const filings = loadAllFilings();
  const priceOf = buildPriceIndex([...filings.values()].flat());
  const touched: string[] = [];

  for (const investor of investors) {
    const byQuarter = new Map<string, CikQuarter[]>();
    for (const cik of investor.ciks) {
      for (const part of filings.get(cik) ?? []) {
        byQuarter.set(part.quarter, [...(byQuarter.get(part.quarter) ?? []), part]);
      }
    }

    const quarters = [...byQuarter.keys()].sort();
    let previous: Portfolio | null = null;
    for (const quarter of quarters) {
      const base = buildPortfolio(investor.id, byQuarter.get(quarter)!, tickerOf, priceOf);
      const changes =
        previous && previous.quarter === previousQuarter(quarter)
          ? diffHoldings(previous.holdings, base.holdings)
          : null;
      const portfolio: Portfolio = { ...base, changes };
      const file = dataPaths.portfolio(investor.id, quarter);
      if (writeJsonIfChanged(file, portfolio)) touched.push(file);
      previous = portfolio;
    }

    // Generated output: drop quarters that no longer have source filings (e.g. a CIK was removed).
    for (const stale of listQuarters(dataPaths.portfoliosDir(investor.id))) {
      if (byQuarter.has(stale)) continue;
      const file = dataPaths.portfolio(investor.id, stale);
      fs.rmSync(file);
      touched.push(file);
    }
  }

  // Investors removed from investors.json.
  if (fs.existsSync(dataPaths.portfoliosRoot)) {
    const ids = new Set(investors.map((i) => i.id));
    for (const dir of fs.readdirSync(dataPaths.portfoliosRoot)) {
      if (ids.has(dir)) continue;
      const full = path.join(dataPaths.portfoliosRoot, dir);
      fs.rmSync(full, { recursive: true });
      touched.push(full);
    }
  }

  return touched;
}
