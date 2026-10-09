import type { Metadata } from "next";
import Link from "next/link";
import { ActionBadge } from "@/app/_components/ui";
import { loadFilingFeed } from "@/lib/data";
import type { FeedEntry } from "@/lib/feed";
import { ACTION_LABELS, edgarFilingUrl, formatDate, formatQuarter, formatUsd } from "@/lib/format";
import type { ChangeAction } from "@/lib/types";

export const metadata: Metadata = { title: "เอกสาร 13F ล่าสุด" };

const MAX_ENTRIES = 150;

export default function FilingsPage() {
  const entries = loadFilingFeed().slice(0, MAX_ENTRIES);
  const byDate = new Map<string, FeedEntry[]>();
  for (const e of entries) byDate.set(e.filedAt, [...(byDate.get(e.filedAt) ?? []), e]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">เอกสาร 13F ล่าสุด</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          เช็คเอกสารใหม่จาก SEC EDGAR ทุกชั่วโมง · ติดตามผ่าน{" "}
          <a href="/feed.xml" className="underline">
            RSS
          </a>
        </p>
      </header>

      <div className="space-y-8">
        {[...byDate].map(([date, dayEntries]) => (
          <section key={date}>
            <h2 className="mb-2 text-sm font-medium text-zinc-500">ยื่น {formatDate(date)}</h2>
            <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              {dayEntries.map((e) => (
                <li key={e.accession} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                  <div className="min-w-48 flex-1">
                    <Link href={`/investors/${e.investorId}/${e.quarter}`} className="font-medium hover:underline">
                      {e.investorName}
                    </Link>
                    <div className="text-xs text-zinc-500">{e.fund}</div>
                  </div>
                  <div className="w-28 whitespace-nowrap">
                    {formatQuarter(e.quarter)}
                    {e.form === "13F-HR/A" && (
                      <span className="ml-1.5 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        ฉบับแก้ไข
                      </span>
                    )}
                  </div>
                  <div className="w-20 text-right tabular-nums">{formatUsd(e.totalValue)}</div>
                  <div className="min-w-56 flex-1">
                    <Counts entry={e} />
                  </div>
                  <a href={edgarFilingUrl(e.cik, e.accession)} className="text-xs text-zinc-500 underline">
                    SEC
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}

function Counts({ entry }: { entry: FeedEntry }) {
  if (entry.form === "13F-HR/A") return null;
  if (!entry.changeCounts) return <span className="text-zinc-400">ไม่มีข้อมูลไตรมาสก่อน</span>;
  const actions = (Object.keys(ACTION_LABELS) as ChangeAction[]).filter((a) => entry.changeCounts![a] > 0);
  if (actions.length === 0) return <span className="text-zinc-400">ไม่มีการเปลี่ยนแปลง</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {actions.map((a) => (
        <ActionBadge key={a} action={a}>
          {ACTION_LABELS[a]} {entry.changeCounts![a]}
        </ActionBadge>
      ))}
    </div>
  );
}
