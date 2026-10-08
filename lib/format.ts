import type { ChangeAction, InvestmentStyle } from "./types";

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const thaiDate = new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatUsd(value: number): string {
  return usdCompact.format(value);
}

export function formatPercent(weight: number): string {
  return `${(weight * 100).toFixed(1)}%`;
}

const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function formatShares(shares: number): string {
  return integer.format(shares);
}

/** 0.253 -> "+25.3%", -0.4 -> "−40.0%" */
export function formatSignedPercent(ratio: number): string {
  const sign = ratio > 0 ? "+" : ratio < 0 ? "−" : "";
  return `${sign}${Math.abs(ratio * 100).toFixed(1)}%`;
}

/** "2026-08-14" -> "14 ส.ค. 2026" */
export function formatDate(isoDate: string): string {
  return thaiDate.format(new Date(`${isoDate}T00:00:00Z`));
}

/** "2026-Q2" -> "Q2/2026" */
export function formatQuarter(quarter: string): string {
  const [year, q] = quarter.split("-");
  return `${q}/${year}`;
}

/** Index page of one filing on EDGAR. */
export function edgarFilingUrl(cik: string, accession: string): string {
  return `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, "")}/${accession}-index.html`;
}

/** List of 13F filings of one CIK on EDGAR. */
export function edgarFilerUrl(cik: string): string {
  return `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=13F&dateb=&owner=include&count=40`;
}

export const STYLE_LABELS: Record<InvestmentStyle, string> = {
  value: "VI",
  growth: "Growth",
  activist: "Activist",
  macro: "Macro",
  quant: "Quant",
  distressed: "Distressed",
};

export const ACTION_LABELS: Record<ChangeAction, string> = {
  new: "ซื้อใหม่",
  add: "เพิ่ม",
  reduce: "ลด",
  exit: "ขายหมด",
};
