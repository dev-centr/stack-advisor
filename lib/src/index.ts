export type AdvisorTimelineEntry = {
  period: string;
  title: string;
  summary: string;
};

export type AdvisorAlternate = {
  versus: string;
  title: string;
  summary: string;
  preferWhen: string;
  problemsSolved: string;
};

export type AdvisorOption = {
  id: string;
  label: string;
  era?: string;
  overview?: string;
  timeline?: AdvisorTimelineEntry[];
  alternates?: AdvisorAlternate[];
};

export type AdvisorStep = {
  id: string;
  title: string;
  hint?: string;
  options: AdvisorOption[];
};

export type AdvisorRecommendation = {
  id: string;
  title: string;
  summary: string;
  tooling: string[];
  caveats: string[];
  docs: string;
  match: Record<string, string[]>;
  matchScore?: number;
};

export type AdvisorCatalog = {
  version: number;
  steps: AdvisorStep[];
  recommendations: AdvisorRecommendation[];
};

export const DEFAULT_DEFINITIONS_REPO =
  "https://github.com/dev-centr/toolchain-advisor.git";

function parseOption(optVal: Record<string, unknown>): AdvisorOption {
  const opt: AdvisorOption = {
    id: String(optVal.id),
    label: String(optVal.label),
    era: optVal.era != null ? String(optVal.era) : undefined,
    overview: optVal.overview != null ? String(optVal.overview) : undefined,
  };
  if (Array.isArray(optVal.timeline)) {
    opt.timeline = optVal.timeline.map((m) => {
      const row = m as Record<string, unknown>;
      return {
        period: String(row.period ?? ""),
        title: String(row.title ?? ""),
        summary: String(row.summary ?? ""),
      };
    });
  }
  if (Array.isArray(optVal.alternates)) {
    opt.alternates = optVal.alternates.map((a) => {
      const row = a as Record<string, unknown>;
      return {
        versus: String(row.versus ?? ""),
        title: String(row.title ?? ""),
        summary: String(row.summary ?? ""),
        preferWhen: String(row.preferWhen ?? ""),
        problemsSolved: String(row.problemsSolved ?? ""),
      };
    });
  }
  return opt;
}

export function parseAdvisorCatalog(data: unknown): AdvisorCatalog {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid catalog: expected object");
  }
  const root = data as Record<string, unknown>;
  const stepsRaw = root.steps;
  const recsRaw = root.recommendations;
  if (!Array.isArray(stepsRaw) || !Array.isArray(recsRaw)) {
    throw new Error("Invalid catalog: missing steps or recommendations");
  }

  const steps: AdvisorStep[] = stepsRaw.map((s) => {
    const step = s as Record<string, unknown>;
    const optionsRaw = step.options;
    if (!Array.isArray(optionsRaw)) {
      throw new Error(`Step ${step.id}: missing options`);
    }
    return {
      id: String(step.id),
      title: String(step.title),
      hint: step.hint != null ? String(step.hint) : undefined,
      options: optionsRaw.map((o) => parseOption(o as Record<string, unknown>)),
    };
  });

  const recommendations: AdvisorRecommendation[] = recsRaw.map((r) => {
    const rec = r as Record<string, unknown>;
    const matchRaw = (rec.match ?? {}) as Record<string, unknown>;
    const match: Record<string, string[]> = {};
    for (const [stepId, allowed] of Object.entries(matchRaw)) {
      match[stepId] = Array.isArray(allowed)
        ? allowed.map((v) => String(v))
        : [];
    }
    return {
      id: String(rec.id),
      title: String(rec.title),
      summary: String(rec.summary),
      tooling: Array.isArray(rec.tooling) ? rec.tooling.map(String) : [],
      caveats: Array.isArray(rec.caveats) ? rec.caveats.map(String) : [],
      docs: rec.docs != null ? String(rec.docs) : "",
      match,
    };
  });

  return {
    version: typeof root.version === "number" ? root.version : 1,
    steps,
    recommendations,
  };
}

export function findOption(
  catalog: AdvisorCatalog,
  stepId: string,
  optionId: string,
): AdvisorOption | undefined {
  const step = catalog.steps.find((s) => s.id === stepId);
  return step?.options.find((o) => o.id === optionId);
}

export function rankRecommendations(
  recs: AdvisorRecommendation[],
  selections: Record<string, string>,
): AdvisorRecommendation[] {
  const scored = recs.map((rec) => {
    if (rec.id === "fallback") {
      return { ...rec, matchScore: 0 };
    }
    let score = 0;
    let criteria = 0;
    for (const [stepId, allowed] of Object.entries(rec.match)) {
      if (!allowed.length) continue;
      criteria++;
      const chosen = selections[stepId];
      if (chosen == null) continue;
      if (allowed.includes(chosen) || allowed.includes("auto")) {
        score += 2;
      } else {
        score -= 4;
      }
    }
    return { ...rec, matchScore: criteria > 0 ? score : 0 };
  });

  return scored.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
}

export function pickBestRecommendation(
  ranked: AdvisorRecommendation[],
): AdvisorRecommendation {
  for (const r of ranked) {
    if (r.id !== "fallback" && (r.matchScore ?? 0) > 0) {
      return r;
    }
  }
  const fallback = ranked.find((r) => r.id === "fallback");
  return fallback ?? ranked[0];
}

export function initialSelections(catalog: AdvisorCatalog): Record<string, string> {
  const selections: Record<string, string> = {};
  for (const step of catalog.steps) {
    if (step.options.length > 0) {
      selections[step.id] = step.options[0].id;
    }
  }
  return selections;
}

/** Web loads compiled JSON bundled at build time (from git checkout + compile). */
export async function fetchBundledAdvisorCatalog(
  path = "/catalog/advisor.json",
): Promise<AdvisorCatalog> {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Failed to load bundled catalog (${res.status})`);
  }
  return parseAdvisorCatalog(await res.json());
}
