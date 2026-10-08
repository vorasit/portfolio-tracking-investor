// Shared data model for the ingest scripts and the web app.
// Everything under /data is generated from (or validated against) these types.

export type InvestmentStyle =
  | "value"
  | "growth"
  | "activist"
  | "macro"
  | "quant"
  | "distressed";

/** One entry of data/investors.json (hand-curated). */
export interface Investor {
  /** URL-safe slug, e.g. "warren-buffett". */
  id: string;
  name: string;
  fund: string;
  /** EDGAR CIKs without leading zeros. Holdings of all CIKs are merged per quarter. */
  ciks: string[];
  styles: InvestmentStyle[];
  notes?: string;
}

export type ThirteenFForm = "13F-HR" | "13F-HR/A";
export type AmendmentType = "RESTATEMENT" | "NEW HOLDINGS";
export type PutCall = "Put" | "Call";

export interface FilingRef {
  cik: string;
  accession: string;
  form: ThirteenFForm;
  /** YYYY-MM-DD */
  filedAt: string;
  amendmentType: AmendmentType | null;
}

/** A position as reported in a 13F information table (rows already aggregated). */
export interface Position {
  cusip: string;
  name: string;
  titleOfClass: string;
  /** Share count, or principal amount when shareType is "PRN". */
  shares: number;
  shareType: "SH" | "PRN";
  /** Options are reported at the notional value of the underlying, not the option price. */
  putCall: PutCall | null;
  /** US dollars. */
  value: number;
}

/** data/filings/{cik}/{quarter}.json — one CIK, one period, after applying amendments. */
export interface CikQuarter {
  cik: string;
  /** Period of report, YYYY-MM-DD (calendar quarter end). */
  period: string;
  /** e.g. "2026-Q2" */
  quarter: string;
  filings: FilingRef[];
  positions: Position[];
}

export interface Holding extends Position {
  ticker: string | null;
  /** Share of totalValue; null for options. */
  weight: number | null;
}

export type ChangeAction = "new" | "add" | "reduce" | "exit";

export interface Change {
  cusip: string;
  ticker: string | null;
  name: string;
  putCall: PutCall | null;
  action: ChangeAction;
  shares: number;
  prevShares: number;
}

/** data/portfolios/{investorId}/{quarter}.json — all CIKs of one investor merged. */
export interface Portfolio {
  investorId: string;
  period: string;
  quarter: string;
  /** Latest filing date among the filings that make up this quarter. */
  filedAt: string;
  filings: FilingRef[];
  /** Sum of non-option positions, in US dollars. */
  totalValue: number;
  holdings: Holding[];
  /** Changes vs. the previous calendar quarter; null when that quarter is not on file. */
  changes: Change[] | null;
}

/** data/cusip-map.json — OpenFIGI lookups, null when OpenFIGI had no match. */
export type CusipMap = Record<string, { ticker: string; name: string; figi: string } | null>;
