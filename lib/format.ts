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

/** "2026-08-14" -> "14 ส.ค. 2026" */
export function formatDate(isoDate: string): string {
  return thaiDate.format(new Date(`${isoDate}T00:00:00Z`));
}

/** "2026-Q2" -> "Q2/2026" */
export function formatQuarter(quarter: string): string {
  const [year, q] = quarter.split("-");
  return `${q}/${year}`;
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
