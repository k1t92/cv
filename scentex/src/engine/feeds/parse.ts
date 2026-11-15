import { parse as parseCsv } from "csv-parse/sync";
import { XMLParser } from "fast-xml-parser";

export type FeedRecord = Record<string, unknown>;
export type FeedFormatName = "CSV" | "XML" | "JSON" | "JSONL";

export interface ParseOptions {
  /** Dot path to the array of records, e.g. "rss.channel.item". Auto-detected when omitted. */
  recordPath?: string;
  /** Key of a nested array to flatten: one output record per child, child available under the same key. */
  explode?: string;
}

const isObject = (v: unknown): v is FeedRecord => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Read a value by dot path. Supports array indexes ("images.0.src") and attribute
 * selectors on arrays ("attrs.a[@name=EAN]"), which is how Ceneo-style XML stores attributes.
 */
export function getPath(record: unknown, path: string): unknown {
  let current: unknown = record;
  for (const raw of path.split(".")) {
    if (current == null) return undefined;
    const selector = raw.match(/^(.+?)\[(@?[\w:-]+)=(.+)\]$/);
    if (selector) {
      const list = isObject(current) ? current[selector[1]!] : undefined;
      const items = Array.isArray(list) ? list : list == null ? [] : [list];
      current = items.find((item) => isObject(item) && String(item[selector[2]!] ?? "").toLowerCase() === selector[3]!.toLowerCase());
      continue;
    }
    if (Array.isArray(current)) current = /^\d+$/.test(raw) ? current[Number(raw)] : current[0] != null ? (current[0] as FeedRecord)[raw] : undefined;
    else if (isObject(current)) current = current[raw];
    else return undefined;
  }
  return current;
}

/** Scalar text of a node: plain values, or the text content of an XML element that also has attributes. */
export function textOf(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value)) return textOf(value[0]);
  if (isObject(value)) return "#text" in value ? textOf(value["#text"]) : undefined;
  const text = String(value).trim();
  return text === "" ? undefined : text;
}

function detectDelimiter(text: string): string {
  const header = text.slice(0, text.indexOf("\n") === -1 ? text.length : text.indexOf("\n"));
  const counts = [",", ";", "\t", "|"].map((d) => [d, header.split(d).length - 1] as const);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0]![1] > 0 ? counts[0]![0] : ",";
}

/** Breadth-first search for the first array of objects: the record list in most feeds. */
function findRecords(root: unknown): FeedRecord[] | null {
  const queue: unknown[] = [root];
  while (queue.length) {
    const node = queue.shift();
    if (Array.isArray(node)) {
      if (node.length && node.every(isObject)) return node as FeedRecord[];
    } else if (isObject(node)) queue.push(...Object.values(node));
  }
  return null;
}

function locate(root: unknown, recordPath: string | undefined): FeedRecord[] {
  if (recordPath) {
    const found = getPath(root, recordPath);
    if (found == null) throw new Error(`Record path "${recordPath}" not found in feed`);
    return (Array.isArray(found) ? found : [found]).filter(isObject);
  }
  if (Array.isArray(root)) return root.filter(isObject);
  const found = findRecords(root);
  if (!found) throw new Error("Could not find a list of records in the feed; set recordPath");
  return found;
}

export function parseFeed(text: string, format: FeedFormatName, options: ParseOptions = {}): FeedRecord[] {
  let records: FeedRecord[];
  switch (format) {
    case "CSV":
      records = parseCsv(text, {
        columns: true, bom: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true, trim: true,
        delimiter: detectDelimiter(text),
      }) as FeedRecord[];
      break;
    case "XML": {
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@", parseTagValue: false, parseAttributeValue: false, trimValues: true });
      records = locate(parser.parse(text), options.recordPath);
      break;
    }
    case "JSON":
      records = locate(JSON.parse(text), options.recordPath);
      break;
    case "JSONL":
      records = text.split(/\r?\n/).filter((line) => line.trim()).map((line) => JSON.parse(line) as FeedRecord).filter(isObject);
      break;
  }
  if (!options.explode) return records;
  const key = options.explode;
  return records.flatMap((record) => {
    const children = record[key];
    const list = Array.isArray(children) ? children : children == null ? [] : [children];
    return list.map((child) => ({ ...record, [key]: child }));
  });
}
