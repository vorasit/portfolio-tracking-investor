import { loadInvestors, loadLatestPortfolio } from "@/lib/data";
import {
  ACTION_LABELS,
  STYLE_LABELS,
  formatDate,
  formatPercent,
  formatQuarter,
  formatUsd,
} from "@/lib/format";
import type { ChangeAction } from "@/lib/types";

const ACTION_STYLES: Record<ChangeAction, string> = {
  new: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  add: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  reduce: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  exit: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
};

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

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="bg-zinc-50 whitespace-nowrap text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">นักลงทุน</th>
              <th className="px-4 py-3 font-medium">ข้อมูล ณ</th>
              <th className="px-4 py-3 text-right font-medium">มูลค่าที่รายงาน</th>
              <th className="px-4 py-3 text-right font-medium">จำนวนหุ้น</th>
              <th className="px-4 py-3 font-medium">เทียบไตรมาสก่อน</th>
              <th className="px-4 py-3 font-medium">ถือมากที่สุด</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {rows.map(({ investor, portfolio }) => (
              <tr key={investor.id} className="align-top">
                <td className="px-4 py-3">
                  <div className="font-medium">{investor.name}</div>
                  <div className="text-zinc-500">{investor.fund}</div>
                  <div className="mt-1 flex gap-1">
                    {investor.styles.map((style) => (
                      <span
                        key={style}
                        className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        {STYLE_LABELS[style]}
                      </span>
                    ))}
                  </div>
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
                      {portfolio.changes ? (
                        <div className="flex flex-wrap gap-1">
                          {(Object.keys(ACTION_LABELS) as ChangeAction[]).map((action) => {
                            const count = portfolio.changes!.filter((c) => c.action === action).length;
                            return count ? (
                              <span key={action} className={`rounded px-1.5 py-0.5 text-xs ${ACTION_STYLES[action]}`}>
                                {ACTION_LABELS[action]} {count}
                              </span>
                            ) : null;
                          })}
                        </div>
                      ) : (
                        <span className="text-zinc-400">ไม่มีข้อมูลไตรมาสก่อน</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ol className="space-y-0.5">
                        {portfolio.holdings
                          .filter((h) => !h.putCall)
                          .slice(0, 3)
                          .map((h) => (
                            <li key={h.cusip} className="flex justify-between gap-3 tabular-nums">
                              <span className="font-medium">{h.ticker ?? h.name}</span>
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

      <footer className="mt-10 space-y-1 text-xs text-zinc-500">
        <p>เว็บนี้ไม่ใช่คำแนะนำการลงทุน ข้อมูลอาจคลาดเคลื่อน โปรดตรวจสอบกับเอกสารต้นฉบับก่อนตัดสินใจ</p>
        <p>
          แหล่งข้อมูล:{" "}
          <a className="underline" href="https://www.sec.gov/edgar/search/">
            SEC EDGAR
          </a>{" "}
          (13F-HR) · CUSIP → ticker จาก{" "}
          <a className="underline" href="https://www.openfigi.com/">
            OpenFIGI
          </a>
        </p>
      </footer>
    </main>
  );
}
