import { parseCoverPage, parseInfoTable, type ParsedFiling } from "../../lib/thirteenf";
import type { ThirteenFForm } from "../../lib/types";
import { ThrottledClient } from "./http";

/** A 13F-HR or 13F-HR/A as listed in the EDGAR submissions API. */
export interface FilingEntry {
  cik: string;
  accession: string;
  form: ThirteenFForm;
  filedAt: string;
  /** Period of report, YYYY-MM-DD. */
  period: string;
}

interface SubmissionColumns {
  accessionNumber: string[];
  filingDate: string[];
  reportDate: string[];
  form: string[];
}

interface Submissions {
  name: string;
  filings: {
    recent: SubmissionColumns;
    files: { name: string; filingFrom: string; filingTo: string }[];
  };
}

const FORMS: ThirteenFForm[] = ["13F-HR", "13F-HR/A"];

export class EdgarClient {
  private readonly http: ThrottledClient;

  constructor(userAgent: string) {
    // SEC allows 10 requests/second; stay well below it.
    this.http = new ThrottledClient({
      minIntervalMs: 150,
      headers: { "User-Agent": userAgent },
    });
  }

  /**
   * Lists 13F holdings reports of a CIK, newest first, reading older pages of the
   * submissions history until at least `periods` distinct periods are found.
   */
  async listThirteenF(cik: string, periods: number): Promise<{ name: string; entries: FilingEntry[] }> {
    const padded = cik.padStart(10, "0");
    const submissions = await this.http.json<Submissions>(
      `https://data.sec.gov/submissions/CIK${padded}.json`,
    );

    const entries = toEntries(cik, submissions.filings.recent);
    for (const page of submissions.filings.files) {
      if (new Set(entries.map((e) => e.period)).size >= periods) break;
      const older = await this.http.json<SubmissionColumns>(`https://data.sec.gov/submissions/${page.name}`);
      entries.push(...toEntries(cik, older));
    }

    entries.sort((a, b) => b.filedAt.localeCompare(a.filedAt) || b.accession.localeCompare(a.accession));
    return { name: submissions.name, entries };
  }

  /** Downloads the cover page and information table of one filing. */
  async fetchFiling(entry: FilingEntry): Promise<ParsedFiling> {
    const base = `https://www.sec.gov/Archives/edgar/data/${entry.cik}/${entry.accession.replace(/-/g, "")}`;
    const index = await this.http.json<{ directory: { item: { name: string }[] } }>(`${base}/index.json`);
    const xmlFiles = index.directory.item.map((i) => i.name).filter((n) => n.toLowerCase().endsWith(".xml"));

    const cover = parseCoverPage(await this.http.text(`${base}/primary_doc.xml`));
    if (cover.period !== entry.period) {
      console.warn(`  ${entry.accession}: cover page period ${cover.period} differs from index ${entry.period}`);
    }

    // The information table's file name is chosen by the filer ("infotable.xml", "43981.xml", ...).
    let rows: ParsedFiling["rows"] = null;
    for (const name of xmlFiles.filter((n) => n !== "primary_doc.xml")) {
      const xml = await this.http.text(`${base}/${name}`);
      if (/<(\w+:)?informationTable[\s>]/.test(xml)) {
        rows = parseInfoTable(xml, entry.filedAt);
        break;
      }
    }

    return {
      filing: {
        cik: entry.cik,
        accession: entry.accession,
        form: entry.form,
        filedAt: entry.filedAt,
        amendmentType: entry.form === "13F-HR/A" ? cover.amendmentType : null,
      },
      rows,
    };
  }
}

function toEntries(cik: string, columns: SubmissionColumns): FilingEntry[] {
  const entries: FilingEntry[] = [];
  columns.form.forEach((form, i) => {
    if (!FORMS.includes(form as ThirteenFForm)) return;
    const period = columns.reportDate[i];
    if (!period) {
      console.warn(`  ${columns.accessionNumber[i]}: ${form} without a report date, skipped`);
      return;
    }
    entries.push({
      cik,
      accession: columns.accessionNumber[i],
      form: form as ThirteenFForm,
      filedAt: columns.filingDate[i],
      period,
    });
  });
  return entries;
}
