import { loadFilingFeed } from "@/lib/data";
import { filingSummary, filingTitle, renderRss } from "@/lib/feed";
import { SITE_NAME, siteUrl } from "@/lib/site";

const MAX_ITEMS = 50;

/** RSS of the latest 13F filings. Prerendered at build time, like every page. */
export async function GET() {
  const site = siteUrl();
  const xml = renderRss({
    title: `${SITE_NAME}: เอกสาร 13F ล่าสุด`,
    link: `${site}/filings`,
    description: "เอกสาร 13F ที่นักลงทุนระดับโลกยื่นต่อ SEC สหรัฐฯ ล่าสุด",
    language: "th",
    items: loadFilingFeed()
      .slice(0, MAX_ITEMS)
      .map((e) => ({
        title: filingTitle(e),
        link: `${site}/investors/${e.investorId}/${e.quarter}`,
        guid: e.accession,
        date: e.filedAt,
        description: filingSummary(e),
      })),
  });
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
