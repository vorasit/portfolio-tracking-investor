import { XMLParser } from "fast-xml-parser";
import type { AmendmentType, FilingRef, Position, PutCall } from "./types";

// Tag values stay strings so CUSIPs keep their leading zeros ("007903107").
// Namespace prefixes vary between filers (ns1:infoTable, n1:infoTable, ...), so strip them.
const parser = new XMLParser({
  ignoreAttributes: true,
  removeNSPrefix: true,
  parseTagValue: false,
  trimValues: true,
  isArray: (name) => name === "infoTable",
});

/** Filings made on or after this date must report value in dollars; earlier ones used thousands. */
const DOLLAR_VALUES_SINCE = "2023-01-03";

/**
 * Returns 1 when values are in dollars, 1000 when they are in thousands.
 * Some filers (Baupost, Duquesne...) still report thousands after the 2023 rule change,
 * so the unit is inferred from the median implied share price: in thousands it comes out
 * around 1000x too small (cents instead of dollars). The filing date is only a fallback.
 */
export function detectValueMultiplier(rows: Position[], filedAt: string): number {
  const prices = rows
    .filter((r) => r.shareType === "SH" && r.shares > 0)
    .map((r) => r.value / r.shares)
    .sort((a, b) => a - b);
  if (prices.length === 0) return filedAt >= DOLLAR_VALUES_SINCE ? 1 : 1000;
  return prices[Math.floor(prices.length / 2)] < 1 ? 1000 : 1;
}

export function normalizeCusip(raw: string): string {
  const cusip = raw.trim().toUpperCase();
  // Some filers drop leading zeros ("7903107" for 007903107).
  return /^[0-9A-Z]{6,8}$/.test(cusip) ? cusip.padStart(9, "0") : cusip;
}

function toNumber(raw: unknown, field: string): number {
  const n = Number(String(raw ?? "").replace(/,/g, ""));
  if (!Number.isFinite(n)) throw new Error(`13F: invalid ${field}: ${String(raw)}`);
  return n;
}

function toPutCall(raw: unknown): PutCall | null {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "put") return "Put";
  if (v === "call") return "Call";
  return null;
}

/** Parses an information table XML into raw rows (one per reported line, value in dollars). */
export function parseInfoTable(xml: string, filedAt: string): Position[] {
  const doc = parser.parse(xml);
  const rows: Record<string, unknown>[] = doc?.informationTable?.infoTable ?? [];

  const positions: Position[] = rows.map((row) => {
    const amount = (row.shrsOrPrnAmt ?? {}) as Record<string, unknown>;
    return {
      cusip: normalizeCusip(String(row.cusip ?? "")),
      name: String(row.nameOfIssuer ?? "").trim(),
      titleOfClass: String(row.titleOfClass ?? "").trim(),
      shares: toNumber(amount.sshPrnamt, "sshPrnamt"),
      shareType: String(amount.sshPrnamtType ?? "SH").trim().toUpperCase() === "PRN" ? "PRN" : "SH",
      putCall: toPutCall(row.putCall),
      value: toNumber(row.value, "value"),
    };
  });

  const multiplier = detectValueMultiplier(positions, filedAt);
  if (multiplier !== 1) for (const p of positions) p.value *= multiplier;
  return positions;
}

export interface CoverPage {
  /** YYYY-MM-DD */
  period: string;
  reportType: string;
  amendmentType: AmendmentType | null;
}

/** Parses the cover page (primary_doc.xml) of a 13F filing. */
export function parseCoverPage(xml: string): CoverPage {
  const doc = parser.parse(xml);
  const cover = doc?.edgarSubmission?.formData?.coverPage;
  if (!cover) throw new Error("13F: primary_doc.xml has no coverPage");

  // MM-DD-YYYY -> YYYY-MM-DD
  const [mm, dd, yyyy] = String(cover.reportCalendarOrQuarter ?? "").split("-");
  const rawType = String(cover.amendmentInfo?.amendmentType ?? "").trim().toUpperCase();

  return {
    period: `${yyyy}-${mm}-${dd}`,
    reportType: String(cover.reportType ?? "").trim(),
    amendmentType:
      rawType === "RESTATEMENT" || rawType === "NEW HOLDINGS" ? rawType : null,
  };
}

function positionKey(p: Pick<Position, "cusip" | "putCall" | "shareType">): string {
  return `${p.cusip}|${p.putCall ?? ""}|${p.shareType}`;
}

/**
 * Merges rows of the same security. Filers list one security on several lines
 * (one per sub-manager / discretion type), and investors with several CIKs
 * can hold the same security in more than one entity.
 */
export function aggregatePositions(rows: Position[]): Position[] {
  const merged = new Map<string, Position>();
  for (const row of rows) {
    const key = positionKey(row);
    const existing = merged.get(key);
    if (existing) {
      existing.shares += row.shares;
      existing.value += row.value;
    } else {
      merged.set(key, { ...row });
    }
  }
  return [...merged.values()].sort((a, b) => b.value - a.value || a.cusip.localeCompare(b.cusip));
}

export interface ParsedFiling {
  filing: FilingRef;
  /** null when the filing has no information table (e.g. a cover-page-only amendment). */
  rows: Position[] | null;
}

/**
 * Applies an original 13F-HR and its amendments in filing order.
 * A 13F-HR or a RESTATEMENT replaces everything before it; NEW HOLDINGS adds rows
 * (typically positions that were confidential when the original was filed).
 */
export function applyFilings(parsed: ParsedFiling[]): Position[] {
  const ordered = [...parsed].sort(
    (a, b) =>
      a.filing.filedAt.localeCompare(b.filing.filedAt) ||
      a.filing.accession.localeCompare(b.filing.accession),
  );

  let rows: Position[] = [];
  for (const { filing, rows: filingRows } of ordered) {
    if (!filingRows) continue;
    if (filing.form === "13F-HR/A" && filing.amendmentType === "NEW HOLDINGS") {
      rows = rows.concat(filingRows);
    } else {
      rows = filingRows;
    }
  }
  return aggregatePositions(rows);
}
