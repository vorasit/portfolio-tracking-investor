import fs from "node:fs";
import path from "node:path";

/**
 * JSON with one array element / flat record per line, so that a quarter's
 * changes show up in git history as readable one-line diffs.
 */
export function formatJson(value: unknown): string {
  return `${format(value, "", true)}\n`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function format(value: unknown, indent: string, top = false): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (!value.every(isRecord)) return JSON.stringify(value);
    return `[\n${value.map((v) => `${indent}  ${JSON.stringify(v)}`).join(",\n")}\n${indent}]`;
  }
  if (isRecord(value)) {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return "{}";
    const flat = entries.every(([, v]) => v === null || typeof v !== "object");
    if (flat && !top) return JSON.stringify(value);
    const body = entries.map(([k, v]) => `${indent}  ${JSON.stringify(k)}: ${format(v, `${indent}  `)}`);
    return `{\n${body.join(",\n")}\n${indent}}`;
  }
  return JSON.stringify(value);
}

/** Writes the file only when its content changes. Returns true when it wrote. */
export function writeJsonIfChanged(file: string, value: unknown): boolean {
  const content = formatJson(value);
  if (fs.existsSync(file) && fs.readFileSync(file, "utf8") === content) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return true;
}
