import type { CusipMap } from "../../lib/types";
import { ThrottledClient } from "./http";

interface FigiResult {
  data?: { figi: string; compositeFIGI?: string; name: string; ticker: string }[];
  warning?: string;
  error?: string;
}

/**
 * Maps CUSIPs to US tickers with the OpenFIGI API.
 * Limits: without a key 25 requests/minute with 10 jobs each; with a key 25 requests/6 seconds with 100 jobs.
 * `onBatch` receives the results of each request so callers can save progress on long runs.
 */
export async function mapCusips(
  cusips: string[],
  apiKey?: string,
  onBatch?: (results: CusipMap) => void,
): Promise<CusipMap> {
  const batchSize = apiKey ? 100 : 10;
  const http = new ThrottledClient({
    minIntervalMs: apiKey ? 250 : 2500,
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "X-OPENFIGI-APIKEY": apiKey } : {}),
    },
  });

  const result: CusipMap = {};
  for (let i = 0; i < cusips.length; i += batchSize) {
    const batch = cusips.slice(i, i + batchSize);
    const responses = await http.json<FigiResult[]>("https://api.openfigi.com/v3/mapping", {
      method: "POST",
      body: JSON.stringify(
        batch.map((cusip) => ({
          // Issuers incorporated outside the US/Canada (Chubb, Aon, ASML...) have CINS numbers,
          // which start with a letter and must be looked up as ID_CINS.
          idType: /^[A-Z]/.test(cusip) ? "ID_CINS" : "ID_CUSIP",
          idValue: cusip,
          exchCode: "US",
        })),
      ),
    });

    const batchResult: CusipMap = {};
    batch.forEach((cusip, j) => {
      const error = responses[j]?.error;
      if (error) {
        console.warn(`  OpenFIGI ${cusip}: ${error}`);
        // A malformed CUSIP (a filer's typo) will never match; anything else is retried next run.
        if (!/invalid idvalue/i.test(error)) return;
      }
      const match = responses[j]?.data?.[0];
      batchResult[cusip] = match
        ? {
            // OpenFIGI writes share classes as "BRK/B"; price APIs and most sites use "BRK.B".
            ticker: match.ticker.replace("/", "."),
            name: match.name,
            figi: match.compositeFIGI ?? match.figi,
          }
        : null;
    });
    Object.assign(result, batchResult);
    onBatch?.(batchResult);
    console.log(`  OpenFIGI: ${Math.min(i + batchSize, cusips.length)}/${cusips.length}`);
  }
  return result;
}
