import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPortfolio, diffHoldings, previousQuarter, quarterOf } from "./portfolio";
import type { CikQuarter, Holding, Position } from "./types";

const pos = (cusip: string, shares: number, value: number, putCall: Position["putCall"] = null): Position => ({
  cusip,
  name: `Company ${cusip}`,
  titleOfClass: "COM",
  shares,
  shareType: "SH",
  putCall,
  value,
});

const holding = (cusip: string, shares: number, putCall: Position["putCall"] = null): Holding => ({
  ...pos(cusip, shares, shares * 10, putCall),
  ticker: cusip.toLowerCase(),
  weight: null,
});

describe("quarter helpers", () => {
  it("maps quarter-end dates", () => {
    assert.equal(quarterOf("2026-06-30"), "2026-Q2");
    assert.equal(quarterOf("2025-12-31"), "2025-Q4");
    assert.throws(() => quarterOf("2026-06-15"));
  });

  it("steps back across a year boundary", () => {
    assert.equal(previousQuarter("2026-Q1"), "2025-Q4");
    assert.equal(previousQuarter("2026-Q3"), "2026-Q2");
  });
});

describe("buildPortfolio", () => {
  const part = (cik: string, positions: Position[], filedAt: string): CikQuarter => ({
    cik,
    period: "2026-03-31",
    quarter: "2026-Q1",
    filings: [{ cik, accession: `acc-${cik}`, form: "13F-HR", filedAt, amendmentType: null }],
    positions,
  });

  it("merges CIKs, excludes options from the total and resolves tickers", () => {
    const portfolio = buildPortfolio(
      "bill-ackman",
      [
        part("1336528", [pos("A", 10, 600), pos("B", 5, 200)], "2026-05-15"),
        part("2026053", [pos("A", 5, 200), pos("SPY", 100, 5000, "Put")], "2026-05-16"),
      ],
      (cusip) => (cusip === "A" ? "AAA" : null),
    );

    assert.equal(portfolio.totalValue, 1000);
    assert.equal(portfolio.filedAt, "2026-05-16");
    assert.equal(portfolio.filings.length, 2);
    const a = portfolio.holdings.find((h) => h.cusip === "A")!;
    assert.deepEqual([a.shares, a.value, a.ticker, a.weight], [15, 800, "AAA", 0.8]);
    assert.equal(portfolio.holdings.find((h) => h.putCall === "Put")!.weight, null);
  });
});

describe("diffHoldings", () => {
  it("classifies new, add, reduce and exit; skips unchanged", () => {
    const prev = [holding("KEEP", 10), holding("ADD", 10), holding("CUT", 10), holding("GONE", 10)];
    const curr = [holding("KEEP", 10), holding("ADD", 15), holding("CUT", 4), holding("NEW", 3)];
    const changes = diffHoldings(prev, curr);
    assert.deepEqual(
      changes.map((c) => [c.cusip, c.action, c.prevShares, c.shares]),
      [
        ["NEW", "new", 0, 3],
        ["ADD", "add", 10, 15],
        ["CUT", "reduce", 10, 4],
        ["GONE", "exit", 10, 0],
      ],
    );
  });

  it("tracks options separately from the shares of the same company", () => {
    const changes = diffHoldings([holding("X", 10)], [holding("X", 10), holding("X", 50, "Call")]);
    assert.deepEqual(changes.map((c) => [c.action, c.putCall]), [["new", "Call"]]);
  });
});
