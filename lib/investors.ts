import type { InvestmentStyle, Investor } from "./types";

const STYLES: InvestmentStyle[] = ["value", "growth", "activist", "macro", "quant", "distressed"];

/** Validates data/investors.json, which is edited by hand and through community PRs. */
export function validateInvestors(input: unknown): Investor[] {
  if (!Array.isArray(input)) throw new Error("investors.json must be an array");

  const errors: string[] = [];
  const ids = new Set<string>();
  const cikOwners = new Map<string, string>();

  input.forEach((raw, i) => {
    const inv = raw as Partial<Investor>;
    const label = `investors[${i}] (${inv?.id ?? "no id"})`;

    if (typeof inv.id !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(inv.id)) {
      errors.push(`${label}: id must be a lowercase slug`);
    } else if (ids.has(inv.id)) {
      errors.push(`${label}: duplicate id`);
    } else {
      ids.add(inv.id);
    }
    if (typeof inv.name !== "string" || !inv.name) errors.push(`${label}: name is required`);
    if (typeof inv.fund !== "string" || !inv.fund) errors.push(`${label}: fund is required`);

    if (!Array.isArray(inv.ciks) || inv.ciks.length === 0) {
      errors.push(`${label}: ciks must be a non-empty array`);
    } else {
      for (const cik of inv.ciks) {
        if (typeof cik !== "string" || !/^[1-9]\d*$/.test(cik)) {
          errors.push(`${label}: CIK "${cik}" must be digits without leading zeros`);
        } else if (cikOwners.has(cik)) {
          errors.push(`${label}: CIK ${cik} is already used by ${cikOwners.get(cik)}`);
        } else {
          cikOwners.set(cik, inv.id ?? label);
        }
      }
    }

    if (!Array.isArray(inv.styles) || inv.styles.some((s) => !STYLES.includes(s))) {
      errors.push(`${label}: styles must be a subset of ${STYLES.join(", ")}`);
    }
    if (inv.notes !== undefined && typeof inv.notes !== "string") {
      errors.push(`${label}: notes must be a string`);
    }
  });

  if (errors.length) throw new Error(`Invalid investors.json:\n  ${errors.join("\n  ")}`);
  return input as Investor[];
}
