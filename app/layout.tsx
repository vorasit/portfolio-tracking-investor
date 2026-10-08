import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "พอร์ตนักลงทุนระดับโลก",
  description: "ติดตามพอร์ตของนักลงทุนระดับโลกจากแบบ 13F ที่ยื่นต่อ SEC สหรัฐฯ",
};

// Data-as-code: every page is generated at build time from /data.
// Live prices will come from the client via /api/prices, never from server rendering.
export const ensureStatic = "navigation";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${plexThai.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
