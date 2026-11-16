/**
 * robots.txt (RFC 9309) parser and matcher.
 * A URL may be fetched only if the rules for our user agent allow it; when no group names us,
 * the "*" group applies. The most specific (longest) matching rule wins; Allow wins ties.
 */
export interface RobotsRules {
  allow: string[];
  disallow: string[];
  crawlDelaySeconds: number | null;
}

export interface Robots {
  groups: { agents: string[]; rules: RobotsRules }[];
  sitemaps: string[];
}

export function parseRobots(text: string): Robots {
  const robots: Robots = { groups: [], sitemaps: [] };
  let current: Robots["groups"][number] | null = null;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const index = line.indexOf(":");
    if (!line || index < 1) continue;
    const field = line.slice(0, index).trim().toLowerCase();
    const value = line.slice(index + 1).trim();
    if (field === "sitemap") {
      if (value) robots.sitemaps.push(value);
      continue;
    }
    if (field === "user-agent") {
      // Consecutive User-agent lines share one group.
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: { allow: [], disallow: [], crawlDelaySeconds: null } };
        robots.groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (field === "allow" && value) current.rules.allow.push(value);
    else if (field === "disallow" && value) current.rules.disallow.push(value);
    else if (field === "crawl-delay") {
      const seconds = Number(value);
      if (Number.isFinite(seconds) && seconds >= 0) current.rules.crawlDelaySeconds = seconds;
    }
  }
  return robots;
}

/** Rules for a product token such as "scentex-bot": its own group(s) if present, otherwise "*". */
export function rulesFor(robots: Robots, productToken: string): RobotsRules {
  const token = productToken.toLowerCase();
  const own = robots.groups.filter((g) => g.agents.some((a) => a !== "*" && token.includes(a)));
  const chosen = own.length ? own : robots.groups.filter((g) => g.agents.includes("*"));
  return {
    allow: chosen.flatMap((g) => g.rules.allow),
    disallow: chosen.flatMap((g) => g.rules.disallow),
    crawlDelaySeconds: chosen.reduce<number | null>((max, g) => (g.rules.crawlDelaySeconds == null ? max : Math.max(max ?? 0, g.rules.crawlDelaySeconds)), null),
  };
}

function patternToRegex(pattern: string): RegExp {
  const anchored = pattern.endsWith("$");
  const body = (anchored ? pattern.slice(0, -1) : pattern).split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`);
}

const specificity = (pattern: string) => pattern.replace(/[*$]/g, "").length;

/** `pathWithQuery` is the URL's path plus query string, e.g. "/products/x?variant=1". */
export function isAllowed(rules: RobotsRules, pathWithQuery: string): boolean {
  let best = { length: -1, allow: true };
  for (const [patterns, allow] of [[rules.disallow, false], [rules.allow, true]] as const) {
    for (const pattern of patterns) {
      if (!patternToRegex(pattern).test(pathWithQuery)) continue;
      const length = specificity(pattern);
      if (length > best.length || (length === best.length && allow)) best = { length, allow };
    }
  }
  return best.allow;
}

/** True when the wildcard rules shut every path: the site does not want automated visitors at all. */
export function disallowsEverything(rules: RobotsRules): boolean {
  return !isAllowed(rules, "/") && rules.allow.length === 0;
}
