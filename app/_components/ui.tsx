import Link from "next/link";
import { hasStockPage } from "@/lib/data";
import { ACTION_LABELS, STYLE_LABELS, formatSignedPercent } from "@/lib/format";
import { tickerSlug } from "@/lib/stocks";
import type { Change, ChangeAction, InvestmentStyle } from "@/lib/types";

const ACTION_STYLES: Record<ChangeAction, string> = {
  new: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  add: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  reduce: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  exit: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
};

export function ActionBadge({ action, children }: { action: ChangeAction; children?: React.ReactNode }) {
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs whitespace-nowrap ${ACTION_STYLES[action]}`}>
      {children ?? ACTION_LABELS[action]}
    </span>
  );
}

/** Counts of new / add / reduce / exit for one quarter. */
export function ChangeSummary({ changes }: { changes: Change[] | null }) {
  if (!changes) return <span className="text-zinc-400">ไม่มีข้อมูลไตรมาสก่อน</span>;
  if (changes.length === 0) return <span className="text-zinc-400">ไม่มีการเปลี่ยนแปลง</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {(Object.keys(ACTION_LABELS) as ChangeAction[]).map((action) => {
        const count = changes.filter((c) => c.action === action).length;
        return count ? (
          <ActionBadge key={action} action={action}>
            {ACTION_LABELS[action]} {count}
          </ActionBadge>
        ) : null;
      })}
    </div>
  );
}

/**
 * The change cell of a holdings table. `hasPrevious` is false when the previous
 * quarter is not on file, so "no change" cannot be told apart from "unknown".
 */
export function ChangeCell({ change, hasPrevious }: { change: Change | null; hasPrevious: boolean }) {
  if (!hasPrevious) return null;
  if (!change) return <span className="text-zinc-400">คงเดิม</span>;
  if (change.action === "new" || change.action === "exit") return <ActionBadge action={change.action} />;
  return (
    <ActionBadge action={change.action}>
      {ACTION_LABELS[change.action]} {formatSignedPercent((change.shares - change.prevShares) / change.prevShares)}
    </ActionBadge>
  );
}

export function StyleTags({ styles }: { styles: InvestmentStyle[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {styles.map((style) => (
        <span
          key={style}
          className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
        >
          {STYLE_LABELS[style]}
        </span>
      ))}
    </div>
  );
}

/** Ticker linking to its stock page, or the issuer name when the CUSIP has no ticker. */
export function TickerLink({ ticker, name }: { ticker: string | null; name: string }) {
  if (!ticker) return <span className="text-zinc-500">{name}</span>;
  // Tickers without a stock page (long-tail positions, stocks nobody holds any more).
  if (!hasStockPage(ticker)) return <span className="font-medium">{ticker}</span>;
  return (
    <Link href={`/stocks/${tickerSlug(ticker)}`} className="font-medium hover:underline">
      {ticker}
    </Link>
  );
}

/** Horizontal bar for a portfolio weight (0..1). */
export function WeightBar({ weight }: { weight: number }) {
  return (
    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
      <div className="h-full rounded-full bg-zinc-500 dark:bg-zinc-400" style={{ width: `${Math.min(weight, 1) * 100}%` }} />
    </div>
  );
}

export function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{children}</div>
    </div>
  );
}

export const tableClass = "w-full text-left text-sm";
export const theadClass = "bg-zinc-50 whitespace-nowrap text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400";
export const tbodyClass = "divide-y divide-zinc-200 dark:divide-zinc-800";
export const tableWrapClass = "overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800";
