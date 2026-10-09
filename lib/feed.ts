import { ACTION_LABELS, formatQuarter, formatUsd } from "./format";
import type { AmendmentType, ChangeAction, Investor, Portfolio, ThirteenFForm } from "./types";

/** One 13F filing (original or amendment), with the quarter it belongs to. */
export interface FeedEntry {
  investorId: string;
  investorName: string;
  fund: string;
  quarter: string;
  cik: string;
  accession: string;
  form: ThirteenFForm;
  amendmentType: AmendmentType | null;
  /** YYYY-MM-DD */
  filedAt: string;
  /** Of the quarter after every filing on record, not only this one. */
  totalValue: number;
  holdingCount: number;
  /** Number of changes per action vs. the previous quarter; null when that quarter is not on file. */
  changeCounts: Record<ChangeAction, number> | null;
}

/** Every filing of every portfolio, newest first. */
export function buildFilingFeed(items: { investor: Investor; portfolio: Portfolio }[]): FeedEntry[] {
  const entries: FeedEntry[] = [];
  for (const { investor, portfolio } of items) {
    const changeCounts = portfolio.changes
      ? portfolio.changes.reduce(
          (counts, c) => ({ ...counts, [c.action]: counts[c.action] + 1 }),
          { new: 0, add: 0, reduce: 0, exit: 0 } as Record<ChangeAction, number>,
        )
      : null;
    for (const filing of portfolio.filings) {
      entries.push({
        investorId: investor.id,
        investorName: investor.name,
        fund: investor.fund,
        quarter: portfolio.quarter,
        cik: filing.cik,
        accession: filing.accession,
        form: filing.form,
        amendmentType: filing.amendmentType,
        filedAt: filing.filedAt,
        totalValue: portfolio.totalValue,
        holdingCount: portfolio.holdings.filter((h) => !h.putCall).length,
        changeCounts,
      });
    }
  }
  return entries.sort((a, b) => b.filedAt.localeCompare(a.filedAt) || b.accession.localeCompare(a.accession));
}

/** "Warren Buffett ยื่น 13F-HR ไตรมาส Q2/2026" */
export function filingTitle(e: FeedEntry): string {
  return `${e.investorName} ยื่น ${e.form} ไตรมาส ${formatQuarter(e.quarter)}`;
}

/** One-line summary used by the RSS feed. */
export function filingSummary(e: FeedEntry): string {
  const value = `มูลค่าพอร์ต ${formatUsd(e.totalValue)} · ${e.holdingCount} หุ้น`;
  if (e.form === "13F-HR/A") return `ฉบับแก้ไข${e.amendmentType ? ` (${e.amendmentType})` : ""} · ${value}`;
  if (!e.changeCounts) return `${value} · ไม่มีข้อมูลไตรมาสก่อน`;
  const counts = (Object.keys(ACTION_LABELS) as ChangeAction[])
    .filter((a) => e.changeCounts![a] > 0)
    .map((a) => `${ACTION_LABELS[a]} ${e.changeCounts![a]}`);
  return `${value} · ${counts.length ? counts.join(", ") : "ไม่มีการเปลี่ยนแปลง"}`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** RFC 822 date for RSS, from a YYYY-MM-DD string. */
function rssDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toUTCString();
}

export interface RssItem {
  title: string;
  link: string;
  guid: string;
  /** YYYY-MM-DD */
  date: string;
  description: string;
}

export interface RssChannel {
  title: string;
  link: string;
  description: string;
  language: string;
  items: RssItem[];
}

/** RSS 2.0. lastBuildDate comes from the newest item so the output only changes with the data. */
export function renderRss(channel: RssChannel): string {
  const items = channel.items
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="false">${escapeXml(item.guid)}</guid>
      <pubDate>${rssDate(item.date)}</pubDate>
      <description>${escapeXml(item.description)}</description>
    </item>`,
    )
    .join("\n");
  const lastBuild = channel.items[0] ? `\n    <lastBuildDate>${rssDate(channel.items[0].date)}</lastBuildDate>` : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(channel.title)}</title>
    <link>${escapeXml(channel.link)}</link>
    <description>${escapeXml(channel.description)}</description>
    <language>${escapeXml(channel.language)}</language>${lastBuild}
${items}
  </channel>
</rss>
`;
}
