import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildFilingFeed, renderRss } from "./feed";
import type { FilingRef, Investor, Portfolio } from "./types";

const investor = (id: string): Investor => ({ id, name: `Name ${id}`, fund: "Fund", ciks: ["1"], styles: ["value"] });

const filing = (accession: string, filedAt: string, form: FilingRef["form"] = "13F-HR"): FilingRef => ({
  cik: "1",
  accession,
  form,
  filedAt,
  amendmentType: form === "13F-HR/A" ? "NEW HOLDINGS" : null,
});

const portfolio = (investorId: string, quarter: string, filings: FilingRef[], changes: Portfolio["changes"]): Portfolio => ({
  investorId,
  period: "2026-06-30",
  quarter,
  filedAt: filings.at(-1)!.filedAt,
  filings,
  totalValue: 100,
  holdings: [],
  changes,
});

describe("buildFilingFeed", () => {
  it("lists every filing, newest first, with the quarter's change counts", () => {
    const feed = buildFilingFeed([
      {
        investor: investor("a"),
        portfolio: portfolio("a", "2026-Q2", [filing("a1", "2026-08-14"), filing("a2", "2026-09-01", "13F-HR/A")], [
          { cusip: "X", ticker: "X", name: "X", putCall: null, action: "new", shares: 1, prevShares: 0 },
          { cusip: "Y", ticker: "Y", name: "Y", putCall: null, action: "exit", shares: 0, prevShares: 1 },
        ]),
      },
      { investor: investor("b"), portfolio: portfolio("b", "2026-Q2", [filing("b1", "2026-08-20")], null) },
    ]);

    assert.deepEqual(feed.map((e) => [e.accession, e.form]), [["a2", "13F-HR/A"], ["b1", "13F-HR"], ["a1", "13F-HR"]]);
    assert.deepEqual(feed[0].changeCounts, { new: 1, add: 0, reduce: 0, exit: 1 });
    assert.equal(feed[1].changeCounts, null);
  });
});

describe("renderRss", () => {
  it("escapes XML and dates the channel from the newest item", () => {
    const xml = renderRss({
      title: "Feed & <stuff>",
      link: "https://example.com",
      description: "d",
      language: "th",
      items: [{ title: "Dodge & Cox", link: "https://example.com/a?x=1&y=2", guid: "g", date: "2026-08-14", description: "<b>" }],
    });
    assert.match(xml, /<title>Feed &amp; &lt;stuff&gt;<\/title>/);
    assert.match(xml, /<title>Dodge &amp; Cox<\/title>/);
    assert.match(xml, /x=1&amp;y=2/);
    assert.match(xml, /<lastBuildDate>Fri, 14 Aug 2026 00:00:00 GMT<\/lastBuildDate>/);
    assert.doesNotMatch(xml, /<b>/);
  });
});
