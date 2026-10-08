import Link from "next/link";
import {
  ChangeSummary,
  StyleTags,
  TickerLink,
  tableClass,
  tableWrapClass,
  tbodyClass,
  theadClass,
} from "@/app/_components/ui";
import { loadInvestors, loadLatestPortfolio } from "@/lib/data";
import { formatDate, formatPercent, formatQuarter, formatUsd } from "@/lib/format";

export default function Home() {
  const rows = loadInvestors().map((investor) => ({
    investor,
    portfolio: loadLatestPortfolio(investor.id),
  }));

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">พอร์ตนักลงทุนระดับโลก</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          ข้อมูลจากแบบ 13F ที่ยื่นต่อ SEC สหรัฐฯ · เฟสทดลอง {rows.length} คน
        </p>
      </header>

      <p className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        พอร์ตที่แสดงคือพอร์ต ณ วันสิ้นไตรมาสที่ระบุ ซึ่งเปิดเผยช้าได้ถึง 45 วัน ไม่ใช่พอร์ตปัจจุบัน
        และมีเฉพาะหุ้นที่ซื้อขายในสหรัฐฯ ฝั่ง long (ไม่รวม short เงินสด และสินทรัพย์นอกสหรัฐฯ)
      </p>

      <div className={tableWrapClass}>
        <table className={`${tableClass} min-w-[56rem]`}>
          <thead className={theadClass}>
            <tr>
              <th className="px-4 py-3 font-medium">นักลงทุน</th>
              <th className="px-4 py-3 font-medium">ข้อมูล ณ</th>
              <th className="px-4 py-3 text-right font-medium">มูลค่าที่รายงาน</th>
              <th className="px-4 py-3 text-right font-medium">จำนวนหุ้น</th>
              <th className="px-4 py-3 font-medium">เทียบไตรมาสก่อน</th>
              <th className="px-4 py-3 font-medium">ถือมากที่สุด</th>
            </tr>
          </thead>
          <tbody className={tbodyClass}>
            {rows.map(({ investor, portfolio }) => (
              <tr key={investor.id} className="align-top">
                <td className="px-4 py-3">
                  {portfolio ? (
                    <Link href={`/investors/${investor.id}`} className="font-medium hover:underline">
                      {investor.name}
                    </Link>
                  ) : (
                    <span className="font-medium">{investor.name}</span>
                  )}
                  <div className="mb-1 text-zinc-500">{investor.fund}</div>
                  <StyleTags styles={investor.styles} />
                </td>
                {portfolio ? (
                  <>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium">{formatQuarter(portfolio.quarter)}</div>
                      <div className="text-zinc-500">ยื่น {formatDate(portfolio.filedAt)}</div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatUsd(portfolio.totalValue)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {portfolio.holdings.filter((h) => !h.putCall).length}
                    </td>
                    <td className="px-4 py-3">
                      <ChangeSummary changes={portfolio.changes} />
                    </td>
                    <td className="px-4 py-3">
                      <ol className="space-y-0.5">
                        {portfolio.holdings
                          .filter((h) => !h.putCall)
                          .slice(0, 3)
                          .map((h) => (
                            <li key={h.cusip} className="flex justify-between gap-3 tabular-nums">
                              <TickerLink ticker={h.ticker} name={h.name} />
                              <span className="text-zinc-500">{formatPercent(h.weight ?? 0)}</span>
                            </li>
                          ))}
                      </ol>
                    </td>
                  </>
                ) : (
                  <td colSpan={5} className="px-4 py-3 text-zinc-400">
                    ยังไม่มีข้อมูล
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
