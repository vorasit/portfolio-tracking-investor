import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChangeCell, WeightBar, tableClass, tableWrapClass, tbodyClass, theadClass } from "@/app/_components/ui";
import { findStock, loadPriceHistory, loadStockIndex } from "@/lib/data";
import {
  externalQuoteLinks,
  formatPercent,
  formatPrice,
  formatQuarter,
  formatShares,
  formatSignedPercent,
  formatUsd,
} from "@/lib/format";
import { previousQuarter } from "@/lib/portfolio";

export function generateStaticParams() {
  return loadStockIndex().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/stocks/[slug]">): Promise<Metadata> {
  const stock = findStock((await params).slug);
  return stock ? { title: `${stock.ticker} · ${stock.name}` } : {};
}

export default async function StockPage({ params }: PageProps<"/stocks/[slug]">) {
  const stock = findStock((await params).slug);
  if (!stock) notFound();

  const shareHolders = stock.holders.filter((h) => !h.putCall);
  const optionHolders = stock.holders.filter((h) => h.putCall);
  const prices = loadPriceHistory(stock.ticker);
  const priceIn = new Map(prices.map((p) => [p.quarter, p.price]));
  const investorLink = (id: string, name: string) => (
    <Link href={`/investors/${id}`} className="font-medium hover:underline">
      {name}
    </Link>
  );

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{stock.ticker}</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">{stock.name}</p>
        <p className="mt-3">
          ถือโดยนักลงทุน <span className="font-semibold">{stock.holderCount}</span> คน
          {stock.totalValue > 0 && <> มูลค่ารวม {formatUsd(stock.totalValue)}</>}
        </p>
        {prices[0] && (
          <p className="mt-1">
            ราคาสิ้นไตรมาส {formatQuarter(prices[0].quarter)}{" "}
            <span className="font-semibold tabular-nums">{formatPrice(prices[0].price)}</span>
          </p>
        )}
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          ดูราคาปัจจุบัน:{" "}
          {externalQuoteLinks(stock.ticker).map((link, i) => (
            <span key={link.href}>
              {i > 0 && " · "}
              <a href={link.href} target="_blank" rel="noopener noreferrer" className="underline">
                {link.label}
              </a>
            </span>
          ))}
        </p>
      </header>

      <p className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        ข้อมูลจากพอร์ตไตรมาสล่าสุดที่นักลงทุนแต่ละคนเปิดเผย ไม่ใช่การถือครองปัจจุบัน
      </p>

      {shareHolders.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">นักลงทุนที่ถือ</h2>
          <div className={tableWrapClass}>
            <table className={`${tableClass} min-w-[48rem]`}>
              <thead className={theadClass}>
                <tr>
                  <th className="px-4 py-3 font-medium">นักลงทุน</th>
                  <th className="px-4 py-3 font-medium">ข้อมูล ณ</th>
                  <th className="px-4 py-3 font-medium">สัดส่วนในพอร์ต</th>
                  <th className="px-4 py-3 text-right font-medium">มูลค่า</th>
                  <th className="px-4 py-3 text-right font-medium">จำนวนหุ้น</th>
                  <th className="px-4 py-3 font-medium">เทียบไตรมาสก่อน</th>
                </tr>
              </thead>
              <tbody className={tbodyClass}>
                {shareHolders.map((h, i) => (
                  <tr key={`${h.investorId}|${i}`}>
                    <td className="px-4 py-2.5">
                      {investorLink(h.investorId, h.investorName)}
                      <div className="text-xs text-zinc-500">{h.fund}</div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{formatQuarter(h.quarter)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2 tabular-nums">
                        <WeightBar weight={h.weight ?? 0} />
                        {formatPercent(h.weight ?? 0)}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatUsd(h.value)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatShares(h.shares)}</td>
                    <td className="px-4 py-2.5">
                      <ChangeCell change={h.change} hasPrevious={h.hasPrevious} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {optionHolders.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-1 text-lg font-semibold">ออปชัน</h2>
          <p className="mb-3 text-sm text-zinc-500">มูลค่าที่แสดงคือมูลค่าของหุ้นอ้างอิงตามที่รายงานใน 13F</p>
          <div className={tableWrapClass}>
            <table className={`${tableClass} min-w-[40rem]`}>
              <thead className={theadClass}>
                <tr>
                  <th className="px-4 py-3 font-medium">นักลงทุน</th>
                  <th className="px-4 py-3 font-medium">ประเภท</th>
                  <th className="px-4 py-3 text-right font-medium">มูลค่าหุ้นอ้างอิง</th>
                  <th className="px-4 py-3 text-right font-medium">จำนวนหุ้นอ้างอิง</th>
                  <th className="px-4 py-3 font-medium">เทียบไตรมาสก่อน</th>
                </tr>
              </thead>
              <tbody className={tbodyClass}>
                {optionHolders.map((h, i) => (
                  <tr key={`${h.investorId}|${i}`}>
                    <td className="px-4 py-2.5">{investorLink(h.investorId, h.investorName)}</td>
                    <td className="px-4 py-2.5">{h.putCall}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatUsd(h.value)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatShares(h.shares)}</td>
                    <td className="px-4 py-2.5">
                      <ChangeCell change={h.change} hasPrevious={h.hasPrevious} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {prices.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-1 text-lg font-semibold">ราคาสิ้นไตรมาส</h2>
          <p className="mb-3 text-sm text-zinc-500">
            คำนวณจากมูลค่า ÷ จำนวนหุ้นใน 13F (ค่ามัธยฐานของทุกกองทุนที่ถือ) ไม่ได้ปรับ stock split
          </p>
          <div className={`${tableWrapClass} max-w-md`}>
            <table className={tableClass}>
              <thead className={theadClass}>
                <tr>
                  <th className="px-4 py-3 font-medium">ไตรมาส</th>
                  <th className="px-4 py-3 text-right font-medium">ราคา</th>
                  <th className="px-4 py-3 text-right font-medium">เทียบไตรมาสก่อน</th>
                </tr>
              </thead>
              <tbody className={tbodyClass}>
                {prices.map(({ quarter, price }) => {
                  const before = priceIn.get(previousQuarter(quarter));
                  return (
                    <tr key={quarter}>
                      <td className="px-4 py-2.5">{formatQuarter(quarter)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{formatPrice(price)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-zinc-500">
                        {before ? formatSignedPercent(price / before - 1) : "–"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {stock.exits.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">ขายหมดในไตรมาสล่าสุด</h2>
          <ul className="space-y-1 text-sm">
            {stock.exits.map((e, i) => (
              <li key={`${e.investorId}|${i}`}>
                {investorLink(e.investorId, e.investorName)}{" "}
                <span className="text-zinc-500">
                  {formatQuarter(e.quarter)} · เดิมถือ {formatShares(e.prevShares)} หุ้น
                  {e.putCall && ` (${e.putCall})`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
