import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPortfolio, buildPriceIndex, diffHoldings, previousQuarter, quarterOf } from "./portfolio";
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
  price: null,
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

describe("buildPriceIndex", () => {
  const filer = (cik: string, quarter: string, positions: Position[]): CikQuarter => ({
    cik,
    period: "2026-06-30",
    quarter,
    filings: [],
    positions,
  });

  it("takes the median implied price across filers and ignores options", () => {
    const priceOf = buildPriceIndex([
      filer("1", "2026-Q2", [pos("A", 10, 1000), pos("A", 100, 999_999, "Put")]),
      filer("2", "2026-Q2", [pos("A", 3, 1000)]), // rounded thousands: implied 333.33
      filer("3", "2026-Q2", [pos("A", 20, 2020)]),
      filer("4", "2026-Q1", [pos("A", 10, 900)]),
    ]);
    assert.equal(priceOf("2026-Q2", "A"), 101);
    assert.equal(priceOf("2026-Q1", "A"), 90);
    assert.equal(priceOf("2026-Q2", "B"), null);
  });

  it("is used by buildPortfolio for share positions only", () => {
    const part = filer("1", "2026-Q2", [pos("A", 10, 1000), pos("A", 5, 500, "Call")]);
    part.filings = [{ cik: "1", accession: "a", form: "13F-HR", filedAt: "2026-08-14", amendmentType: null }];
    const portfolio = buildPortfolio("x", [part], () => null, buildPriceIndex([part]));
    assert.deepEqual(portfolio.holdings.map((h) => [h.putCall, h.price]), [[null, 100], ["Call", null]]);
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
