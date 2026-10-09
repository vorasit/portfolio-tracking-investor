/**
 * Absolute origin of the site, for RSS links and metadata.
 * SITE_URL wins (e.g. a custom domain); on Vercel builds the production domain is
 * provided as VERCEL_PROJECT_PRODUCTION_URL; locally it falls back to localhost.
 */
export function siteUrl(): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

export const SITE_NAME = "พอร์ตนักลงทุนระดับโลก";
