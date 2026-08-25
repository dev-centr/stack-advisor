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
import { optionMark } from "./icons";
import "./browser.css";

export type BrowseMode = "guided" | "diy";

export type StackAdvisorProps = {
  /** `site` remaps colors to host CSS variables; `standalone` uses local theme. */
  embed?: "site" | "standalone";
  catalogPath?: string;
};

/** @deprecated Use StackAdvisorProps */
export type ToolchainBrowserProps = StackAdvisorProps;

function OptionGlyph(props: { id: string }) {
  const m = () => optionMark(props.id);
  return (
    <span class="tb-glyph" style={{ "--mark": m().tone }} aria-hidden="true">
      {m().glyph}
    </span>
  );
}

const LevelPanel: Component<{
  step: AdvisorStep;
  selection: string;
  onSelect: (optionId: string) => void;
  onClear?: () => void;
  allowClear: boolean;
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
        <Show when={props.allowClear && props.selection}>
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
            alternates.
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
  const [mode, setMode] = createSignal<BrowseMode>("guided");
  const [selections, setSelections] = createSignal<Record<string, string>>({});
  /** DIY: step ids unlocked for filtering (combinatoric build-up). */
  const [unlocked, setUnlocked] = createSignal<string[]>([]);
  const [focusStepId, setFocusStepId] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(true);

  const steps = createMemo(() => catalog()?.steps ?? []);
  const focusStep = createMemo(
    () => steps().find((s) => s.id === focusStepId()) ?? steps()[0],
  );
  const crumbSteps = createMemo(() => {
    if (mode() === "guided") return steps();
    const ids = new Set(unlocked());
    return steps().filter((s) => ids.has(s.id));
  });

  const applyMode = (next: BrowseMode, data: AdvisorCatalog) => {
    setMode(next);
    if (next === "guided") {
      setSelections(initialSelections(data));
      setUnlocked(data.steps.map((s) => s.id));
      setFocusStepId(data.steps[0]?.id ?? "");
    } else {
      setSelections(emptySelections(data));
      const first = data.steps[0]?.id ?? "";
      setUnlocked(first ? [first] : []);
      setFocusStepId(first);
    }
  };

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBundledAdvisorCatalog(
        props.catalogPath ?? "/catalog/advisor.json",
      );
      setCatalog(data);
      applyMode(mode(), data);
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
    setFocusStepId(stepId);
    if (mode() === "guided") {
      const idx = steps().findIndex((s) => s.id === stepId);
      const next = steps()[idx + 1];
      if (next) setFocusStepId(next.id);
    }
  };

  const clearLevel = (stepId: string) => {
    setSelections((prev) => ({ ...prev, [stepId]: "" }));
  };

  const addFilterLevel = () => {
    const locked = steps().find((s) => !unlocked().includes(s.id));
    if (!locked) return;
    setUnlocked((prev) => [...prev, locked.id]);
    setFocusStepId(locked.id);
  };

  const canAddLevel = createMemo(
    () => mode() === "diy" && unlocked().length < steps().length,
  );

  return (
    <div
      class="tb-root"
      data-embed={props.embed ?? "standalone"}
      data-mode={mode()}
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
        <div class="tb-mode-bar">
          <div class="tb-seg" role="group" aria-label="Browse mode">
            <button
              type="button"
              aria-pressed={mode() === "guided"}
              onClick={() => applyMode("guided", catalog()!)}
            >
              Guided path
            </button>
            <button
              type="button"
              aria-pressed={mode() === "diy"}
              onClick={() => applyMode("diy", catalog()!)}
            >
              Build filters
            </button>
          </div>
          <p>
            <Show
              when={mode() === "guided"}
              fallback="DIY: add filter levels as you go. Unset levels do not constrain advice—good for browsing aggregates."
            >
              Guided: typical stack is preloaded. Focus one level at a time;
              use the strip to jump.
            </Show>
          </p>
        </div>

        <nav class="tb-crumb" aria-label="Filter levels">
          <For each={crumbSteps()}>
            {(step) => (
              <button
                type="button"
                data-active={focusStepId() === step.id}
                data-set={Boolean(selections()[step.id])}
                onClick={() => setFocusStepId(step.id)}
              >
                {step.title}
                <Show when={selections()[step.id]}> · set</Show>
              </button>
            )}
          </For>
        </nav>

        <div class="tb-layout">
          <div>
            <Show when={focusStep()}>
              {(step) => (
                <LevelPanel
                  step={step()}
                  selection={selections()[step().id] ?? ""}
                  onSelect={(id) => selectOption(step().id, id)}
                  allowClear={mode() === "diy"}
                  onClear={() => clearLevel(step().id)}
                />
              )}
            </Show>
            <div class="tb-actions">
              <Show when={canAddLevel()}>
                <button
                  type="button"
                  class="primary"
                  onClick={addFilterLevel}
                >
                  Add filter level
                </button>
              </Show>
              <Show when={mode() === "guided" && focusStep()}>
                <button
                  type="button"
                  onClick={() => {
                    const idx = steps().findIndex(
                      (s) => s.id === focusStepId(),
                    );
                    const prev = steps()[idx - 1];
                    if (prev) setFocusStepId(prev.id);
                  }}
                >
                  Previous
                </button>
                <button
                  type="button"
                  class="primary"
                  onClick={() => {
                    const idx = steps().findIndex(
                      (s) => s.id === focusStepId(),
                    );
                    const next = steps()[idx + 1];
                    if (next) setFocusStepId(next.id);
                  }}
                >
                  Next level
                </button>
              </Show>
            </div>
          </div>
          <ContextPanel
            catalog={catalog()!}
            focusStepId={focusStepId()}
            selections={selections()}
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
          . Browse and advice are modes of Stack Advisor.
        </p>
      </Show>
    </div>
  );
};

/** @deprecated Use StackAdvisor */
export const ToolchainBrowser = StackAdvisor;
export default StackAdvisor;
