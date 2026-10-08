import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: { default: "พอร์ตนักลงทุนระดับโลก", template: "%s · พอร์ตนักลงทุนระดับโลก" },
  description: "ติดตามพอร์ตของนักลงทุนระดับโลกจากแบบ 13F ที่ยื่นต่อ SEC สหรัฐฯ",
};

// Data-as-code: every page is generated at build time from /data.
// No live prices: free price APIs do not license public display (see plan.md),
// so pages show quarter-end prices implied by 13F filings and link out for quotes.
export const ensureStatic = "navigation";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${plexThai.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
            <Link href="/" className="font-semibold">
              พอร์ตนักลงทุน
            </Link>
            <nav className="flex gap-4 text-sm text-zinc-600 dark:text-zinc-400">
              <Link href="/" className="hover:text-foreground">
                นักลงทุน
              </Link>
              <Link href="/stocks" className="hover:text-foreground">
                หุ้น
              </Link>
            </nav>
          </div>
        </header>

        {children}

        <footer className="border-t border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto w-full max-w-6xl space-y-1 px-4 py-6 text-xs text-zinc-500 sm:px-6">
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
          </div>
        </footer>
      </body>
    </html>
  );
}
