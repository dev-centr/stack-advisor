import {
  createMemo,
  createSignal,
  For,
  onMount,
  Show,
  type Component,
} from "solid-js";
import {
  emptySelections,
  fetchBundledAdvisorCatalog,
  filterOptions,
  findOption,
  initialSelections,
  pickBestRecommendation,
  prefersIconGrid,
  rankRecommendations,
  type AdvisorCatalog,
  type AdvisorOption,
  type AdvisorStep,
} from "@dev-centr/stack-advisor-core";
import { optionMark, type OptionMark } from "./icons";
import "./browser.css";

export type StackAdvisorProps = {
  /** `site` remaps colors to host CSS variables; `standalone` uses local theme. */
  embed?: "site" | "standalone";
  catalogPath?: string;
};

/** @deprecated Use StackAdvisorProps */
export type ToolchainBrowserProps = StackAdvisorProps;

function MarkVisual(props: { mark: OptionMark }) {
  const m = () => props.mark;
  return (
    <Show
      when={m().kind === "pair"}
      fallback={
        <Show
          when={m().kind === "icon"}
          fallback={
            <span
              class="tb-glyph tb-glyph--text"
              style={{ "--mark": m().tone }}
              aria-hidden="true"
            >
              {(m() as Extract<OptionMark, { kind: "glyph" }>).glyph}
            </span>
          }
        >
          <span
            class="tb-glyph tb-glyph--icon"
            style={{ "--mark": m().tone }}
            aria-hidden="true"
          >
            <img
              src={(m() as Extract<OptionMark, { kind: "icon" }>).src}
              alt=""
              draggable={false}
            />
          </span>
        </Show>
      }
    >
      <span
        class="tb-glyph tb-glyph--pair"
        style={{ "--mark": m().tone }}
        aria-hidden="true"
      >
        <img
          src={(m() as Extract<OptionMark, { kind: "pair" }>).left}
          alt=""
          draggable={false}
        />
        <img
          src={(m() as Extract<OptionMark, { kind: "pair" }>).right}
          alt=""
          draggable={false}
        />
      </span>
    </Show>
  );
}

function OptionGlyph(props: { id: string }) {
  return <MarkVisual mark={optionMark(props.id)} />;
}

/** Keep path ids in catalog order. */
function sortPathIds(all: AdvisorStep[], ids: string[]): string[] {
  const want = new Set(ids);
  return all.map((s) => s.id).filter((id) => want.has(id));
}

const LevelPanel: Component<{
  step: AdvisorStep;
  selection: string;
  onSelect: (optionId: string) => void;
  onClear?: () => void;
}> = (props) => {
  const [query, setQuery] = createSignal("");
  const visible = createMemo(() => filterOptions(props.step, query()));
  const useGrid = createMemo(() => prefersIconGrid(props.step));
  const selectedHidden = createMemo(() => {
    const id = props.selection;
    if (!id) return false;
    return !visible().some((o) => o.id === id);
  });
  const selectedOpt = createMemo(() =>
    props.step.options.find((o) => o.id === props.selection),
  );

  return (
    <section class="tb-panel" aria-labelledby={`tb-level-${props.step.id}`}>
      <h2 id={`tb-level-${props.step.id}`}>{props.step.title}</h2>
      <Show when={props.step.hint}>
        <p class="tb-hint">{props.step.hint}</p>
      </Show>
      <Show when={!useGrid() || props.step.options.length > 6}>
        <input
          type="search"
          class="tb-search"
          placeholder="Filter options…"
          value={query()}
          onInput={(e) => setQuery(e.currentTarget.value)}
          aria-label={`Filter ${props.step.title}`}
        />
      </Show>
      <Show when={selectedHidden() && selectedOpt()}>
        <p class="tb-kept" role="status">
          Selected: {selectedOpt()!.label} (hidden by filter — clear filter or
          pick another)
        </p>
      </Show>
      <Show
        when={useGrid()}
        fallback={
          <ul class="tb-list">
            <For each={visible()}>
              {(opt) => (
                <li>
                  <button
                    type="button"
                    aria-pressed={props.selection === opt.id}
                    onClick={() => props.onSelect(opt.id)}
                  >
                    <OptionGlyph id={opt.id} />
                    <span>{opt.label}</span>
                    <Show when={opt.era}>
                      <span class="tb-era">{opt.era}</span>
                    </Show>
                  </button>
                </li>
              )}
            </For>
          </ul>
        }
      >
        <div class="tb-grid" role="listbox" aria-label={props.step.title}>
          <For each={visible()}>
            {(opt: AdvisorOption) => (
              <button
                type="button"
                class="tb-icon-btn"
                role="option"
                aria-selected={props.selection === opt.id}
                aria-pressed={props.selection === opt.id}
                onClick={() => props.onSelect(opt.id)}
              >
                <OptionGlyph id={opt.id} />
                <span class="label">{opt.label}</span>
              </button>
            )}
          </For>
        </div>
      </Show>
      <div class="tb-actions">
        <Show when={props.selection}>
          <button type="button" onClick={() => props.onClear?.()}>
            Clear this level
          </button>
        </Show>
      </div>
    </section>
  );
};

const ContextPanel: Component<{
  catalog: AdvisorCatalog;
  focusStepId: string;
  selections: Record<string, string>;
}> = (props) => {
  const opt = createMemo(() =>
    findOption(
      props.catalog,
      props.focusStepId,
      props.selections[props.focusStepId] ?? "",
    ),
  );
  const best = createMemo(() =>
    pickBestRecommendation(
      rankRecommendations(props.catalog.recommendations, props.selections),
    ),
  );

  return (
    <aside class="tb-panel tb-context">
      <Show
        when={opt()}
        fallback={
          <p class="tb-status">
            Select an option to see overview, timeline, and how it compares to
            alternates. Levels not on the path stay unconstrained in guidance.
          </p>
        }
      >
        {(o) => (
          <>
            <h2>{o().label}</h2>
            <Show when={o().era}>
              <p>Era: {o().era}</p>
            </Show>
            <Show when={o().overview}>
              <h3>Overview</h3>
              <p class="tb-overview">{o().overview}</p>
            </Show>
            <Show when={o().timeline && o().timeline!.length > 0}>
              <h3>Timeline</h3>
              <For each={o().timeline!}>
                {(m) => (
                  <p>
                    <strong>
                      {m.period} — {m.title}
                    </strong>
                    <br />
                    {m.summary}
                  </p>
                )}
              </For>
            </Show>
            <Show when={o().alternates && o().alternates!.length > 0}>
              <h3>Compare alternates</h3>
              <For each={o().alternates!}>
                {(alt) => (
                  <p>
                    <strong>{alt.title || `vs ${alt.versus}`}</strong>
                    <br />
                    {alt.summary}
                    <Show when={alt.preferWhen}>
                      <br />
                      Prefer when: {alt.preferWhen}
                    </Show>
                  </p>
                )}
              </For>
            </Show>
          </>
        )}
      </Show>
      <section class="tb-guidance">
        <h3>Guidance for current constraints</h3>
        <p class="tb-guidance-title">{best().title}</p>
        <p>{best().summary}</p>
        <Show when={best().docs}>
          <p>
            <a href={best().docs} target="_blank" rel="noopener noreferrer">
              Read docs
            </a>
          </p>
        </Show>
      </section>
    </aside>
  );
};

export const StackAdvisor: Component<StackAdvisorProps> = (props) => {
  const [catalog, setCatalog] = createSignal<AdvisorCatalog | null>(null);
  const [selections, setSelections] = createSignal<Record<string, string>>({});
  /** Step ids currently on the filter path (catalog order). */
  const [pathIds, setPathIds] = createSignal<string[]>([]);
  const [focusStepId, setFocusStepId] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(true);

  const steps = createMemo(() => catalog()?.steps ?? []);
  const pathSteps = createMemo(() => {
    const byId = new Map(steps().map((s) => [s.id, s]));
    return pathIds()
      .map((id) => byId.get(id))
      .filter((s): s is AdvisorStep => Boolean(s));
  });
  const focusStep = createMemo(() => {
    const onPath = pathSteps().find((s) => s.id === focusStepId());
    return onPath ?? pathSteps()[0];
  });

  /** First catalog step missing from the path whose index is in (after, before). */
  const missingBetween = (afterId: string | null, beforeId: string | null) => {
    const all = steps();
    const afterIdx = afterId ? all.findIndex((s) => s.id === afterId) : -1;
    const beforeIdx = beforeId
      ? all.findIndex((s) => s.id === beforeId)
      : all.length;
    const onPath = new Set(pathIds());
    return all.find(
      (s, i) => i > afterIdx && i < beforeIdx && !onPath.has(s.id),
    );
  };

  const firstMissingOverall = createMemo(() => {
    const onPath = new Set(pathIds());
    return steps().find((s) => !onPath.has(s.id));
  });

  const canAppend = createMemo(() => Boolean(firstMissingOverall()));

  const sampleLoaded = createMemo(() => {
    const data = catalog();
    if (!data) return false;
    if (pathIds().length !== data.steps.length) return false;
    const sample = initialSelections(data);
    const cur = selections();
    return data.steps.every((s) => (cur[s.id] ?? "") === (sample[s.id] ?? ""));
  });

  const pathDirty = createMemo(() => {
    const data = catalog();
    if (!data) return false;
    if (pathIds().length !== data.steps.length) return true;
    return data.steps.some((s) => !(selections()[s.id] ?? ""));
  });

  const loadSample = (data: AdvisorCatalog) => {
    setSelections(initialSelections(data));
    setPathIds(data.steps.map((s) => s.id));
    setFocusStepId(data.steps[0]?.id ?? "");
  };

  const addToPath = (stepId: string) => {
    setPathIds((prev) => sortPathIds(steps(), [...prev, stepId]));
    setFocusStepId(stepId);
  };

  const removeFromPath = (stepId: string) => {
    const next = pathIds().filter((id) => id !== stepId);
    setPathIds(next);
    setSelections((prev) => ({ ...prev, [stepId]: "" }));
    if (focusStepId() === stepId) {
      setFocusStepId(next[next.length - 1] ?? next[0] ?? "");
    }
  };

  const clearLevelSelection = (stepId: string) => {
    setSelections((prev) => ({ ...prev, [stepId]: "" }));
  };

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBundledAdvisorCatalog(
        props.catalogPath ?? "/catalog/advisor.json",
      );
      setCatalog(data);
      loadSample(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load catalog");
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    void reload();
  });

  const selectOption = (stepId: string, optionId: string) => {
    setSelections((prev) => ({ ...prev, [stepId]: optionId }));
    // Stay on the level the user clicked — no auto-forward.
    setFocusStepId(stepId);
  };

  /** Selections for ranking: only path members constrain; others empty. */
  const adviceSelections = createMemo(() => {
    const onPath = new Set(pathIds());
    const out: Record<string, string> = {};
    for (const s of steps()) {
      out[s.id] = onPath.has(s.id) ? (selections()[s.id] ?? "") : "";
    }
    return out;
  });

  return (
    <div
      class="tb-root"
      data-embed={props.embed ?? "standalone"}
    >
      <Show when={loading()}>
        <p class="tb-status">Loading definitions…</p>
      </Show>
      <Show when={error()}>
        <p class="tb-error">{error()}</p>
        <div class="tb-actions">
          <button type="button" class="primary" onClick={() => void reload()}>
            Retry
          </button>
        </div>
      </Show>
      <Show when={catalog() && !loading() && !error()}>
        <div class="tb-toolbar">
          <p class="tb-lede-inline">
            A sample path is preloaded. Remove a level with ×; insert with +
            between segments or at the end. Off-path levels do not constrain
            advice.
          </p>
          <Show when={pathDirty() || !sampleLoaded()}>
            <button
              type="button"
              class="primary tb-sample-btn"
              onClick={() => loadSample(catalog()!)}
            >
              Reset to sample
            </button>
          </Show>
        </div>

        <div class="tb-path-row">
          <nav class="tb-path" aria-label="Filter path">
            <For each={pathSteps()}>
              {(step, index) => {
                const isSet = () => Boolean(selections()[step.id]);
                const isActive = () => focusStepId() === step.id;
                const next = () => pathSteps()[index() + 1];
                const insertCandidate = () =>
                  next()
                    ? missingBetween(step.id, next()!.id)
                    : undefined;
                const isLast = () => index() === pathSteps().length - 1;

                return (
                  <div
                    class="tb-path-seg"
                    data-active={isActive()}
                    data-set={isSet()}
                    data-first={index() === 0}
                    data-last={isLast()}
                  >
                    <button
                      type="button"
                      class="tb-path-main"
                      aria-current={isActive() ? "step" : undefined}
                      onClick={() => setFocusStepId(step.id)}
                    >
                      <span class="tb-path-num" aria-hidden="true">
                        {index() + 1}
                      </span>
                      <span class="tb-path-label">{step.title}</span>
                      <span
                        class="tb-path-light"
                        data-on={isSet()}
                        title={
                          isSet()
                            ? "Level has a selection"
                            : "Level cleared"
                        }
                        aria-hidden="true"
                      />
                      <span class="sr-only">
                        {isSet() ? ", selected" : ", cleared"}
                      </span>
                    </button>
                    <Show when={isSet() || pathSteps().length > 1}>
                      <button
                        type="button"
                        class="tb-path-clear"
                        aria-label={
                          pathSteps().length > 1
                            ? `Remove ${step.title} from path`
                            : `Clear ${step.title}`
                        }
                        title={
                          pathSteps().length > 1
                            ? `Remove ${step.title}`
                            : `Clear ${step.title}`
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          if (pathSteps().length > 1) {
                            removeFromPath(step.id);
                          } else {
                            clearLevelSelection(step.id);
                          }
                        }}
                      >
                        ×
                      </button>
                    </Show>
                    <Show when={insertCandidate()}>
                      {(miss) => (
                        <button
                          type="button"
                          class="tb-path-insert"
                          aria-label={`Insert ${miss().title} after ${step.title}`}
                          title={`Insert ${miss().title}`}
                          onClick={() => addToPath(miss().id)}
                        >
                          +
                        </button>
                      )}
                    </Show>
                  </div>
                );
              }}
            </For>
          </nav>
          <Show when={canAppend()}>
            <button
              type="button"
              class="tb-path-append"
              aria-label={`Add ${firstMissingOverall()!.title} to path`}
              title={`Add ${firstMissingOverall()!.title}`}
              onClick={() => addToPath(firstMissingOverall()!.id)}
            >
              +
            </button>
          </Show>
        </div>

        <div class="tb-layout">
          <div>
            <Show when={focusStep()}>
              {(step) => (
                <LevelPanel
                  step={step()}
                  selection={selections()[step().id] ?? ""}
                  onSelect={(id) => selectOption(step().id, id)}
                  onClear={() => clearLevelSelection(step().id)}
                />
              )}
            </Show>
            <div class="tb-actions">
              <button
                type="button"
                onClick={() => {
                  const idx = pathSteps().findIndex(
                    (s) => s.id === focusStepId(),
                  );
                  const prev = pathSteps()[idx - 1];
                  if (prev) setFocusStepId(prev.id);
                }}
              >
                Previous
              </button>
              <button
                type="button"
                class="primary"
                onClick={() => {
                  const idx = pathSteps().findIndex(
                    (s) => s.id === focusStepId(),
                  );
                  const next = pathSteps()[idx + 1];
                  if (next) setFocusStepId(next.id);
                }}
              >
                Next level
              </button>
              <Show when={catalog() && (pathDirty() || !sampleLoaded())}>
                <button
                  type="button"
                  onClick={() => {
                    const data = catalog()!;
                    setSelections(emptySelections(data));
                    setPathIds(data.steps.map((s) => s.id));
                    setFocusStepId(data.steps[0]?.id ?? "");
                  }}
                >
                  Clear all
                </button>
              </Show>
            </div>
          </div>
          <ContextPanel
            catalog={catalog()!}
            focusStepId={focusStepId()}
            selections={adviceSelections()}
          />
        </div>
        <p class="tb-source">
          Definitions from{" "}
          <a
            href="https://github.com/dev-centr/stack-advisor"
            target="_blank"
            rel="noopener noreferrer"
          >
            dev-centr/stack-advisor
          </a>
          . Browse and advice share one filter path.
        </p>
      </Show>
    </div>
  );
};

/** @deprecated Use StackAdvisor */
export const ToolchainBrowser = StackAdvisor;
export default StackAdvisor;
