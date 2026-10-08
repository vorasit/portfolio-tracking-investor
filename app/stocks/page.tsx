import type { Metadata } from "next";
import Link from "next/link";
import { ActionBadge, tableClass, tableWrapClass, tbodyClass, theadClass } from "@/app/_components/ui";
import { loadStockIndex } from "@/lib/data";
import { formatUsd } from "@/lib/format";

export const metadata: Metadata = { title: "หุ้นที่ superinvestor ถือ" };

export default function StocksPage() {
  const stocks = loadStockIndex();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">หุ้นที่ superinvestor ถือ</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          รวมจากพอร์ตไตรมาสล่าสุดของนักลงทุนแต่ละคน เรียงตามจำนวนนักลงทุนที่ถือ
        </p>
      </header>

      <div className={tableWrapClass}>
        <table className={`${tableClass} min-w-[40rem]`}>
          <thead className={theadClass}>
            <tr>
              <th className="px-4 py-3 font-medium">หุ้น</th>
              <th className="px-4 py-3 text-right font-medium">นักลงทุนที่ถือ</th>
              <th className="px-4 py-3 text-right font-medium">มูลค่ารวม</th>
              <th className="px-4 py-3 font-medium">ไตรมาสล่าสุด</th>
            </tr>
          </thead>
          <tbody className={tbodyClass}>
            {stocks.map((s) => {
              const buyers = s.holders.filter((h) => !h.putCall && h.change?.action === "new").length;
              return (
                <tr key={s.slug}>
                  <td className="px-4 py-2.5">
                    <Link href={`/stocks/${s.slug}`} className="font-medium hover:underline">
                      {s.ticker}
                    </Link>
                    <div className="text-xs text-zinc-500">{s.name}</div>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{s.holderCount}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {s.totalValue ? formatUsd(s.totalValue) : <span className="text-zinc-400">–</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {buyers > 0 && <ActionBadge action="new">ซื้อใหม่ {buyers}</ActionBadge>}
                      {s.exits.length > 0 && <ActionBadge action="exit">ขายหมด {s.exits.length}</ActionBadge>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        ไม่รวมหลักทรัพย์ที่ยังหา ticker ไม่ได้ ส่วนผู้ถือออปชันแสดงอยู่ในหน้าของแต่ละหุ้น
      </p>
    </main>
  );
}
