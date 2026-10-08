import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyFilings, detectValueMultiplier, normalizeCusip, parseCoverPage, parseInfoTable } from "./thirteenf";
import type { FilingRef, Position } from "./types";

const INFO_TABLE = `<?xml version="1.0" encoding="UTF-8"?>
<informationTable xmlns="http://www.sec.gov/edgar/document/thirteenf/informationtable">
  <infoTable>
    <nameOfIssuer>ADVANCED MICRO DEVICES INC</nameOfIssuer>
    <titleOfClass>COM</titleOfClass>
    <cusip>007903107</cusip>
    <value>114729725</value>
    <shrsOrPrnAmt><sshPrnamt>197500</sshPrnamt><sshPrnamtType>SH</sshPrnamtType></shrsOrPrnAmt>
    <investmentDiscretion>SOLE</investmentDiscretion>
  </infoTable>
  <infoTable>
    <nameOfIssuer>ISHARES TR</nameOfIssuer>
    <titleOfClass>RUSSELL 2000 ETF</titleOfClass>
    <cusip>464287655</cusip>
    <value>50000000</value>
    <shrsOrPrnAmt><sshPrnamt>200000</sshPrnamt><sshPrnamtType>SH</sshPrnamtType></shrsOrPrnAmt>
    <putCall>Put</putCall>
    <investmentDiscretion>SOLE</investmentDiscretion>
  </infoTable>
</informationTable>`;

// Same data, written with a namespace prefix the way some filing agents do.
const PREFIXED_INFO_TABLE = `<ns1:informationTable xmlns:ns1="http://www.sec.gov/edgar/document/thirteenf/informationtable">
  <ns1:infoTable>
    <ns1:nameOfIssuer>APPLE INC</ns1:nameOfIssuer>
    <ns1:titleOfClass>COM</ns1:titleOfClass>
    <ns1:cusip>037833100</ns1:cusip>
    <ns1:value>1,000</ns1:value>
    <ns1:shrsOrPrnAmt><ns1:sshPrnamt>10</ns1:sshPrnamt><ns1:sshPrnamtType>SH</ns1:sshPrnamtType></ns1:shrsOrPrnAmt>
  </ns1:infoTable>
</ns1:informationTable>`;

const COVER_PAGE = `<edgarSubmission xmlns="http://www.sec.gov/edgar/thirteenffiler" xmlns:ns1="http://www.sec.gov/edgar/common">
  <formData>
    <coverPage>
      <reportCalendarOrQuarter>03-31-2025</reportCalendarOrQuarter>
      <isAmendment>true</isAmendment>
      <amendmentNo>1</amendmentNo>
      <amendmentInfo><amendmentType>NEW HOLDINGS</amendmentType></amendmentInfo>
      <filingManager><name>Berkshire Hathaway Inc</name><address><ns1:city>Omaha</ns1:city></address></filingManager>
      <reportType>13F HOLDINGS REPORT</reportType>
    </coverPage>
  </formData>
</edgarSubmission>`;

describe("parseInfoTable", () => {
  it("keeps CUSIP leading zeros and reads options", () => {
    const rows = parseInfoTable(INFO_TABLE, "2026-08-14");
    assert.equal(rows.length, 2);
    assert.deepEqual(rows[0], {
      cusip: "007903107",
      name: "ADVANCED MICRO DEVICES INC",
      titleOfClass: "COM",
      shares: 197500,
      shareType: "SH",
      putCall: null,
      value: 114729725,
    });
    assert.equal(rows[1].putCall, "Put");
  });

  it("handles namespace prefixes, a single row and thousands separators", () => {
    const rows = parseInfoTable(PREFIXED_INFO_TABLE, "2026-08-14");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].cusip, "037833100");
    assert.equal(rows[0].value, 1000);
  });

  it("detects values reported in thousands, even after the 2023 rule change", () => {
    // AMD at ~$580/share reported as 114730 (thousands) -> implied $0.58/share.
    const xml = INFO_TABLE.replace("114729725", "114730").replace("50000000", "50000");
    const rows = parseInfoTable(xml, "2026-08-14");
    assert.deepEqual(rows.map((r) => r.value), [114_730_000, 50_000_000]);
  });

  it("drops the placeholder row of an empty report", () => {
    const xml = `<informationTable><infoTable><nameOfIssuer>0</nameOfIssuer><titleOfClass>0</titleOfClass>
      <cusip>000000000</cusip><value>0</value><shrsOrPrnAmt><sshPrnamt>0</sshPrnamt><sshPrnamtType>SH</sshPrnamtType></shrsOrPrnAmt>
      </infoTable></informationTable>`;
    assert.deepEqual(parseInfoTable(xml, "2026-08-14"), []);
  });

  it("keeps dollar values from before 2023 when the implied price says dollars", () => {
    const [row] = parseInfoTable(PREFIXED_INFO_TABLE, "2022-11-14");
    assert.equal(row.value, 1000);
  });
});

describe("detectValueMultiplier", () => {
  it("falls back to the filing date when there are no share rows", () => {
    const bond = { cusip: "X", name: "X", titleOfClass: "NOTE", shares: 1000, shareType: "PRN" as const, putCall: null, value: 1 };
    assert.equal(detectValueMultiplier([bond], "2022-11-14"), 1000);
    assert.equal(detectValueMultiplier([bond], "2023-02-14"), 1);
  });
});

describe("normalizeCusip", () => {
  it("restores dropped leading zeros", () => {
    assert.equal(normalizeCusip("7903107"), "007903107");
    assert.equal(normalizeCusip(" 23331a109 "), "23331A109");
  });
});

describe("parseCoverPage", () => {
  it("reads period and amendment type", () => {
    assert.deepEqual(parseCoverPage(COVER_PAGE), {
      period: "2025-03-31",
      reportType: "13F HOLDINGS REPORT",
      amendmentType: "NEW HOLDINGS",
    });
  });
});

describe("applyFilings", () => {
  const filing = (accession: string, filedAt: string, form: FilingRef["form"], amendmentType: FilingRef["amendmentType"] = null): FilingRef => ({
    cik: "1",
    accession,
    form,
    filedAt,
    amendmentType,
  });
  const pos = (cusip: string, shares: number, value = shares): Position => ({
    cusip,
    name: cusip,
    titleOfClass: "COM",
    shares,
    shareType: "SH",
    putCall: null,
    value,
  });

  it("merges duplicate rows of the same security", () => {
    const result = applyFilings([{ filing: filing("a", "2025-05-15", "13F-HR"), rows: [pos("A", 10), pos("A", 5), pos("B", 1)] }]);
    assert.deepEqual(result.map((p) => [p.cusip, p.shares]), [["A", 15], ["B", 1]]);
  });

  it("adds NEW HOLDINGS amendments to the original", () => {
    const result = applyFilings([
      { filing: filing("b", "2025-08-14", "13F-HR/A", "NEW HOLDINGS"), rows: [pos("C", 7)] },
      { filing: filing("a", "2025-05-15", "13F-HR"), rows: [pos("A", 10)] },
    ]);
    assert.deepEqual(result.map((p) => p.cusip), ["A", "C"]);
  });

  it("treats a NEW HOLDINGS amendment that repeats the original as a restatement", () => {
    const result = applyFilings([
      { filing: filing("a", "2026-08-05", "13F-HR"), rows: [pos("A", 10), pos("B", 5), pos("C", 1)] },
      { filing: filing("b", "2026-08-24", "13F-HR/A", "NEW HOLDINGS"), rows: [pos("A", 10), pos("B", 5), pos("C", 1), pos("D", 2)] },
    ]);
    assert.deepEqual(result.map((p) => [p.cusip, p.shares]), [["A", 10], ["B", 5], ["D", 2], ["C", 1]]);
  });

  it("replaces everything with a RESTATEMENT, ignoring amendments without a table", () => {
    const result = applyFilings([
      { filing: filing("a", "2025-05-15", "13F-HR"), rows: [pos("A", 10)] },
      { filing: filing("b", "2025-05-16", "13F-HR/A", "RESTATEMENT"), rows: [pos("B", 3)] },
      { filing: filing("c", "2025-05-17", "13F-HR/A", "RESTATEMENT"), rows: null },
    ]);
    assert.deepEqual(result.map((p) => p.cusip), ["B"]);
  });
});
