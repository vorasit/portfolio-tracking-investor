import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PortfolioView } from "@/app/_components/portfolio-view";
import { findInvestor, listPortfolioQuarters, loadLatestPortfolios, loadPortfolio } from "@/lib/data";
import { previousQuarter } from "@/lib/portfolio";

export function generateStaticParams() {
  return loadLatestPortfolios().map(({ investor }) => ({ id: investor.id }));
}

export async function generateMetadata({ params }: PageProps<"/investors/[id]">): Promise<Metadata> {
  const investor = findInvestor((await params).id);
  return investor ? { title: `${investor.name} · ${investor.fund}` } : {};
}

/** The investor's latest quarter. Earlier quarters live at /investors/[id]/[quarter]. */
export default async function InvestorPage({ params }: PageProps<"/investors/[id]">) {
  const { id } = await params;
  const investor = findInvestor(id);
  const quarters = investor ? listPortfolioQuarters(id) : [];
  const latest = quarters.at(-1);
  const portfolio = latest ? loadPortfolio(id, latest) : null;
  if (!investor || !portfolio) notFound();

  return (
    <PortfolioView
      investor={investor}
      portfolio={portfolio}
      previous={loadPortfolio(id, previousQuarter(portfolio.quarter))}
      quarters={quarters}
    />
  );
}
