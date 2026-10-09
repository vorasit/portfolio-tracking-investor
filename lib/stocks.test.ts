import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildStockIndex, tickerSlug } from "./stocks";
import type { Change, Holding, Investor, Portfolio } from "./types";

const investor = (id: string): Investor => ({ id, name: id, fund: `${id} fund`, ciks: ["1"], styles: ["value"] });

const holding = (ticker: string | null, value: number, putCall: Holding["putCall"] = null): Holding => ({
  cusip: `CUSIP-${ticker}`,
  name: `${ticker} INC`,
  titleOfClass: "COM",
  shares: value / 10,
  shareType: "SH",
  putCall,
  value,
  ticker,
  weight: putCall ? null : 0.5,
  price: null,
});

const portfolio = (investorId: string, holdings: Holding[], changes: Change[] | null): Portfolio => ({
  investorId,
  period: "2026-06-30",
  quarter: "2026-Q2",
  filedAt: "2026-08-14",
  filings: [],
  totalValue: 0,
  holdings,
  changes,
});

describe("tickerSlug", () => {
  it("makes share classes URL-safe", () => {
    assert.equal(tickerSlug("BRK.B"), "brk-b");
    assert.equal(tickerSlug("AAPL"), "aapl");
  });
});

describe("buildStockIndex", () => {
  const index = buildStockIndex([
    {
      investor: investor("a"),
      portfolio: portfolio("a", [holding("AAPL", 100), holding("SPY", 999, "Put"), holding(null, 50)], [
        { cusip: "CUSIP-AAPL", ticker: "AAPL", name: "AAPL INC", putCall: null, action: "new", shares: 10, prevShares: 0 },
        { cusip: "CUSIP-KO", ticker: "KO", name: "KO INC", putCall: null, action: "exit", shares: 0, prevShares: 7 },
      ]),
    },
    { investor: investor("b"), portfolio: portfolio("b", [holding("AAPL", 300)], null) },
  ]);
  const bySlug = new Map(index.map((e) => [e.slug, e]));

  it("ranks by number of investors holding shares", () => {
    assert.deepEqual(index.map((e) => [e.ticker, e.holderCount]), [["AAPL", 2], ["KO", 0], ["SPY", 0]]);
  });

  it("aggregates holders with their changes, largest first", () => {
    const aapl = bySlug.get("aapl")!;
    assert.equal(aapl.totalValue, 400);
    assert.deepEqual(aapl.holders.map((h) => [h.investorId, h.change?.action ?? null]), [["b", null], ["a", "new"]]);
  });

  it("keeps options apart from the share count and records exits", () => {
    assert.equal(bySlug.get("spy")!.holders[0].putCall, "Put");
    assert.deepEqual(bySlug.get("ko")!.exits.map((e) => [e.investorId, e.prevShares]), [["a", 7]]);
  });
});
