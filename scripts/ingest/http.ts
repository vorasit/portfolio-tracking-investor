const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface ClientOptions {
  /** Minimum gap between two requests, to stay under the provider's rate limit. */
  minIntervalMs: number;
  headers: Record<string, string>;
  maxAttempts?: number;
}

/** Sequential HTTP client that spaces out requests and retries 429 / 5xx / network errors. */
export class ThrottledClient {
  private nextSlot = 0;

  constructor(private readonly options: ClientOptions) {}

  async request(url: string, init: RequestInit = {}): Promise<Response> {
    const maxAttempts = this.options.maxAttempts ?? 5;

    for (let attempt = 1; ; attempt++) {
      const wait = this.nextSlot - Date.now();
      if (wait > 0) await sleep(wait);
      this.nextSlot = Date.now() + this.options.minIntervalMs;

      let response: Response | undefined;
      try {
        response = await fetch(url, {
          ...init,
          headers: { ...this.options.headers, ...(init.headers as Record<string, string>) },
        });
      } catch (error) {
        if (attempt >= maxAttempts) throw error;
      }

      if (response && response.status !== 429 && response.status < 500) {
        if (!response.ok) {
          throw new Error(`${init.method ?? "GET"} ${url} -> HTTP ${response.status}`);
        }
        return response;
      }
      if (attempt >= maxAttempts) {
        throw new Error(`${init.method ?? "GET"} ${url} -> HTTP ${response?.status} after ${attempt} attempts`);
      }

      const retryAfter = Number(response?.headers.get("retry-after"));
      const backoff = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 1000;
      console.warn(`  retry ${attempt}/${maxAttempts - 1} in ${backoff / 1000}s: ${url} (${response?.status ?? "network error"})`);
      await sleep(backoff);
    }
  }

  async json<T>(url: string, init?: RequestInit): Promise<T> {
    return (await this.request(url, init)).json() as Promise<T>;
  }

  async text(url: string, init?: RequestInit): Promise<string> {
    return (await this.request(url, init)).text();
  }
}
