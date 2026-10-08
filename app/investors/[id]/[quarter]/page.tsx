import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PortfolioView } from "@/app/_components/portfolio-view";
import { findInvestor, listPortfolioQuarters, loadInvestors, loadPortfolio } from "@/lib/data";
import { formatQuarter } from "@/lib/format";
import { previousQuarter } from "@/lib/portfolio";

export function generateStaticParams() {
  return loadInvestors().flatMap((investor) =>
    listPortfolioQuarters(investor.id).map((quarter) => ({ id: investor.id, quarter })),
  );
}

export async function generateMetadata({ params }: PageProps<"/investors/[id]/[quarter]">): Promise<Metadata> {
  const { id, quarter } = await params;
  const investor = findInvestor(id);
  if (!investor || !/^\d{4}-Q[1-4]$/.test(quarter)) return {};
  return { title: `${investor.name} ${formatQuarter(quarter)}` };
}

export default async function InvestorQuarterPage({ params }: PageProps<"/investors/[id]/[quarter]">) {
  const { id, quarter } = await params;
  const investor = findInvestor(id);
  const portfolio = loadPortfolio(id, quarter);
  if (!investor || !portfolio) notFound();

  return (
    <PortfolioView
      investor={investor}
      portfolio={portfolio}
      previous={loadPortfolio(id, previousQuarter(quarter))}
      quarters={listPortfolioQuarters(id)}
    />
  );
}
