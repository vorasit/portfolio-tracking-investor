// Usage:
//   npm run ingest                         all investors, last 8 quarters
//   npm run ingest -- --investor warren-buffett --quarters 4
//   npm run ingest -- --retry-missing-tickers
//   npm run ingest -- --force              re-download periods already on disk (after a parser fix)
//   npm run derive                         rebuild data/portfolios only (no network)

import fs from "node:fs";
import { parseArgs } from "node:util";
import { dataPaths, listQuarters, loadInvestors, readJson, readJsonIfExists } from "../../lib/data";
import { quarterOf } from "../../lib/portfolio";
import { applyFilings } from "../../lib/thirteenf";
import type { CikQuarter, CusipMap, Investor } from "../../lib/types";
import { derivePortfolios } from "./derive";
import { EdgarClient, type FilingEntry } from "./edgar";
import { mapCusips } from "./openfigi";
import { writeJsonIfChanged } from "./store";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local: rely on the environment (GitHub Actions secrets).
}

const { values: args } = parseArgs({
  options: {
    investor: { type: "string", multiple: true, default: [] },
    quarters: { type: "string", default: "8" },
    offline: { type: "boolean", default: false },
    force: { type: "boolean", default: false },
    "retry-missing-tickers": { type: "boolean", default: false },
  },
});

async function main() {
  const investors = loadInvestors();
  const unknown = args.investor.filter((id) => !investors.some((i) => i.id === id));
  if (unknown.length) throw new Error(`Unknown investor id: ${unknown.join(", ")}`);

  if (!args.offline) {
    const userAgent = process.env.SEC_USER_AGENT?.trim();
    if (!userAgent || !userAgent.includes("@")) {
      throw new Error(
        'SEC_USER_AGENT must contain a name and a contact email, e.g. "my-project me@example.com". See .env.example.',
      );
    }
    const quarters = Number(args.quarters);
    if (!Number.isInteger(quarters) || quarters < 1) throw new Error("--quarters must be a positive integer");

    const edgar = new EdgarClient(userAgent);
    const selected = args.investor.length ? investors.filter((i) => args.investor.includes(i.id)) : investors;
    for (const investor of selected) {
      await ingestInvestor(edgar, investor, quarters, args.force);
    }
    await updateCusipMap(args["retry-missing-tickers"]);
  }

  const touched = derivePortfolios(investors);
  console.log(`portfolios: ${touched.length} file(s) updated`);
}

/** Fetches the last `quarters` periods of every CIK of an investor, skipping periods already on disk. */
async function ingestInvestor(edgar: EdgarClient, investor: Investor, quarters: number, force: boolean) {
  console.log(`${investor.id}`);

  const byCik = new Map<string, FilingEntry[]>();
  for (const cik of investor.ciks) {
    const { name, entries } = await edgar.listThirteenF(cik, quarters);
    console.log(`  CIK ${cik} ${name}: ${entries.length} 13F filing(s) listed`);
    byCik.set(cik, entries);
  }

  // Periods are chosen per investor so that a fund that moved to a new CIK keeps a continuous history.
  const periods = [...new Set([...byCik.values()].flat().map((e) => e.period))].sort().slice(-quarters);

  for (const [cik, entries] of byCik) {
    for (const period of periods) {
      const forPeriod = entries.filter((e) => e.period === period);
      if (forPeriod.length === 0) continue;

      const quarter = quarterOf(period);
      const file = dataPaths.filing(cik, quarter);
      const existing = readJsonIfExists<CikQuarter>(file);
      const known = new Set(existing?.filings.map((f) => f.accession));
      const upToDate = forPeriod.length === known.size && forPeriod.every((e) => known.has(e.accession));
      if (existing && upToDate && !force) {
        continue;
      }

      const parsed = [];
      for (const entry of forPeriod) parsed.push(await edgar.fetchFiling(entry));
      const positions = applyFilings(parsed);
      const filings = parsed
        .map((p) => p.filing)
        .sort((a, b) => a.filedAt.localeCompare(b.filedAt) || a.accession.localeCompare(b.accession));

      const data: CikQuarter = { cik, period, quarter, filings, positions };
      writeJsonIfChanged(file, data);
      console.log(`  ${quarter} CIK ${cik}: ${positions.length} positions from ${filings.length} filing(s)`);
    }
  }
}

/** Looks up CUSIPs that appear in data/filings but are not yet in cusip-map.json. */
async function updateCusipMap(retryMissing: boolean) {
  const map = readJsonIfExists<CusipMap>(dataPaths.cusipMap) ?? {};
  const overrides = readJsonIfExists<Record<string, string | null>>(dataPaths.cusipOverrides) ?? {};

  const cusips = new Set<string>();
  if (fs.existsSync(dataPaths.filingsRoot)) {
    for (const cik of fs.readdirSync(dataPaths.filingsRoot)) {
      for (const quarter of listQuarters(dataPaths.filingsDir(cik))) {
        for (const p of readJson<CikQuarter>(dataPaths.filing(cik, quarter)).positions) cusips.add(p.cusip);
      }
    }
  }

  const missing = [...cusips]
    .filter((c) => !(c in overrides) && (!(c in map) || (retryMissing && map[c] === null)))
    .sort();
  if (missing.length === 0) return;

  console.log(`cusip-map: looking up ${missing.length} CUSIP(s)`);
  // Saved after every request, so an interrupted run keeps what it already looked up.
  const save = (results: CusipMap) => {
    Object.assign(map, results);
    writeJsonIfChanged(dataPaths.cusipMap, Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b))));
  };
  await mapCusips(missing, process.env.OPENFIGI_API_KEY || undefined, save);

  const unresolved = missing.filter((c) => map[c] === null);
  if (unresolved.length) {
    console.log(`cusip-map: ${unresolved.length} CUSIP(s) without a ticker (add them to cusip-overrides.json if needed)`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
