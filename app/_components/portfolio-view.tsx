import Link from "next/link";
import {
  ChangeCell,
  ChangeSummary,
  Stat,
  StyleTags,
  TickerLink,
  WeightBar,
  tableClass,
  tableWrapClass,
  tbodyClass,
  theadClass,
} from "@/app/_components/ui";
import {
  edgarFilerUrl,
  edgarFilingUrl,
  formatDate,
  formatPercent,
  formatPrice,
  formatQuarter,
  formatShares,
  formatSignedPercent,
  formatUsd,
} from "@/lib/format";
import { changeLookup } from "@/lib/portfolio";
import type { Investor, Portfolio } from "@/lib/types";

// Quant and macro funds report thousands of rows; rendering all of them made
// pages of several MB. Show the largest positions and say how much they cover.
const MAX_SHARE_ROWS = 100;
const MAX_OPTION_ROWS = 50;
const MAX_EXITS = 60;

interface Props {
  investor: Investor;
  portfolio: Portfolio;
  previous: Portfolio | null;
  /** All quarters on file, oldest first. */
  quarters: string[];
}

export function PortfolioView({ investor, portfolio, previous, quarters }: Props) {
  const latest = quarters.at(-1);
  const isLatest = portfolio.quarter === latest;
  const changeOf = changeLookup(portfolio.changes);
  const hasPrevious = portfolio.changes !== null;
  const shares = portfolio.holdings.filter((h) => !h.putCall);
  const options = portfolio.holdings.filter((h) => h.putCall);
  const exits = (portfolio.changes ?? []).filter((c) => c.action === "exit");
  const valueChange = previous && previous.totalValue ? portfolio.totalValue / previous.totalValue - 1 : null;
  const shownShares = shares.slice(0, MAX_SHARE_ROWS);
  const shownWeight = shownShares.reduce((sum, h) => sum + (h.weight ?? 0), 0);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <header className="mb-6 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{investor.name}</h1>
        <div className="flex flex-wrap items-center gap-2 text-zinc-600 dark:text-zinc-400">
          <span>{investor.fund}</span>
          <StyleTags styles={investor.styles} />
        </div>
        {investor.notes && <p className="max-w-3xl text-sm text-zinc-500">{investor.notes}</p>}
      </header>

      <nav aria-label="ไตรมาส" className="mb-4 flex flex-wrap gap-1.5">
        {[...quarters].reverse().map((q) => (
          <Link
            key={q}
            href={q === latest ? `/investors/${investor.id}` : `/investors/${investor.id}/${q}`}
            aria-current={q === portfolio.quarter ? "page" : undefined}
            className={
              q === portfolio.quarter
                ? "rounded-md bg-zinc-900 px-2.5 py-1 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "rounded-md border border-zinc-200 px-2.5 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            }
          >
            {formatQuarter(q)}
          </Link>
        ))}
      </nav>

      <p className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        พอร์ต ณ วันที่ {formatDate(portfolio.period)} ยื่นต่อ SEC เมื่อ {formatDate(portfolio.filedAt)}
        {isLatest ? " ซึ่งเป็นข้อมูลล่าสุดที่เปิดเผย ไม่ใช่พอร์ตปัจจุบัน" : " ซึ่งเป็นข้อมูลย้อนหลัง"}
        {!isLatest && (
          <>
            {" · "}
            <Link href={`/investors/${investor.id}`} className="underline">
              ดูไตรมาสล่าสุด
            </Link>
          </>
        )}
      </p>

      <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="มูลค่าที่รายงาน">{formatUsd(portfolio.totalValue)}</Stat>
        <Stat label="มูลค่าเทียบไตรมาสก่อน">
          {valueChange === null ? <span className="text-zinc-400">–</span> : formatSignedPercent(valueChange)}
        </Stat>
        <Stat label="จำนวนหุ้น">{shares.length}</Stat>
        <Stat label="การเปลี่ยนแปลง">
          <div className="text-sm font-normal">
            <ChangeSummary changes={portfolio.changes} />
          </div>
        </Stat>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">หุ้นที่ถือ</h2>
        <div className={tableWrapClass}>
          <table className={`${tableClass} min-w-[54rem]`}>
            <thead className={theadClass}>
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">หุ้น</th>
                <th className="px-4 py-3 font-medium">สัดส่วน</th>
                <th className="px-4 py-3 text-right font-medium">มูลค่า</th>
                <th className="px-4 py-3 text-right font-medium">จำนวนหุ้น</th>
                <th className="px-4 py-3 text-right font-medium">ราคาสิ้นไตรมาส</th>
                <th className="px-4 py-3 font-medium">เทียบไตรมาสก่อน</th>
              </tr>
            </thead>
            <tbody className={tbodyClass}>
              {shownShares.map((h, i) => (
                <tr key={`${h.cusip}|${h.shareType}`}>
                  <td className="px-4 py-2.5 text-zinc-400 tabular-nums">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <TickerLink ticker={h.ticker} name={h.name} />
                    {h.ticker && <div className="text-xs text-zinc-500">{h.name}</div>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2 tabular-nums">
                      <WeightBar weight={h.weight ?? 0} />
                      {formatPercent(h.weight ?? 0)}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatUsd(h.value)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {formatShares(h.shares)}
                    {h.shareType === "PRN" && <span className="ml-1 text-xs text-zinc-500">PRN</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {h.price === null ? <span className="text-zinc-400">–</span> : formatPrice(h.price)}
                  </td>
                  <td className="px-4 py-2.5">
                    <ChangeCell change={changeOf(h)} hasPrevious={hasPrevious} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {shares.length > shownShares.length && (
          <p className="mt-2 text-sm text-zinc-500">
            แสดง {shownShares.length} อันดับแรกจากทั้งหมด {formatShares(shares.length)} ตัว คิดเป็น{" "}
            {formatPercent(shownWeight)} ของมูลค่าพอร์ต
          </p>
        )}
        <p className="mt-2 text-xs text-zinc-500">
          ราคาสิ้นไตรมาสคำนวณจากมูลค่า ÷ จำนวนหุ้นใน 13F ของทุกกองทุนที่ถือหุ้นตัวนั้น ไม่ใช่ราคาปัจจุบัน
          {shownShares.some((h) => h.shareType === "PRN") && " · PRN คือตราสารหนี้ แสดงเป็นมูลค่าเงินต้นแทนจำนวนหุ้น"}
        </p>
      </section>

      {options.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-1 text-lg font-semibold">ออปชัน</h2>
          <p className="mb-3 text-sm text-zinc-500">
            13F รายงานออปชันเป็นมูลค่าของหุ้นอ้างอิง ไม่ใช่ราคาออปชัน จึงไม่นับรวมในมูลค่าพอร์ต
          </p>
          <div className={tableWrapClass}>
            <table className={`${tableClass} min-w-[40rem]`}>
              <thead className={theadClass}>
                <tr>
                  <th className="px-4 py-3 font-medium">ประเภท</th>
                  <th className="px-4 py-3 font-medium">หุ้นอ้างอิง</th>
                  <th className="px-4 py-3 text-right font-medium">มูลค่าหุ้นอ้างอิง</th>
                  <th className="px-4 py-3 text-right font-medium">จำนวนหุ้นอ้างอิง</th>
                  <th className="px-4 py-3 font-medium">เทียบไตรมาสก่อน</th>
                </tr>
              </thead>
              <tbody className={tbodyClass}>
                {options.slice(0, MAX_OPTION_ROWS).map((h) => (
                  <tr key={`${h.cusip}|${h.putCall}`}>
                    <td className="px-4 py-2.5">{h.putCall}</td>
                    <td className="px-4 py-2.5">
                      <TickerLink ticker={h.ticker} name={h.name} />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatUsd(h.value)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatShares(h.shares)}</td>
                    <td className="px-4 py-2.5">
                      <ChangeCell change={changeOf(h)} hasPrevious={hasPrevious} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {options.length > MAX_OPTION_ROWS && (
            <p className="mt-2 text-sm text-zinc-500">
              แสดง {MAX_OPTION_ROWS} รายการแรกจากทั้งหมด {formatShares(options.length)} รายการ
            </p>
          )}
        </section>
      )}

      {exits.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">ขายหมดในไตรมาสนี้</h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {exits.slice(0, MAX_EXITS).map((c) => (
              <li
                key={`${c.cusip}|${c.putCall}`}
                className="rounded-md border border-zinc-200 px-2.5 py-1 dark:border-zinc-800"
              >
                <TickerLink ticker={c.ticker} name={c.name} />
                {c.putCall && <span className="ml-1 text-zinc-500">{c.putCall}</span>}
                <span className="ml-2 text-zinc-500 tabular-nums">{formatShares(c.prevShares)} หุ้น</span>
              </li>
            ))}
            {exits.length > MAX_EXITS && (
              <li className="px-2.5 py-1 text-zinc-500">และอีก {formatShares(exits.length - MAX_EXITS)} ตัว</li>
            )}
          </ul>
        </section>
      )}

      <section className="text-sm text-zinc-600 dark:text-zinc-400">
        <h2 className="mb-2 text-lg font-semibold text-foreground">เอกสารต้นฉบับ</h2>
        <ul className="space-y-1">
          {portfolio.filings.map((f) => (
            <li key={f.accession}>
              <a href={edgarFilingUrl(f.cik, f.accession)} className="underline">
                {f.form} {f.accession}
              </a>{" "}
              ยื่น {formatDate(f.filedAt)}
              {f.amendmentType && ` (${f.amendmentType})`}
            </li>
          ))}
        </ul>
        <p className="mt-2">
          CIK:{" "}
          {investor.ciks.map((cik, i) => (
            <span key={cik}>
              {i > 0 && ", "}
              <a href={edgarFilerUrl(cik)} className="underline">
                {cik}
              </a>
            </span>
          ))}
        </p>
      </section>
    </main>
  );
}
