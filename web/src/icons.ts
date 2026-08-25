/** Glyph + short mark for option ids. Prefer logos when we have them later. */
const MARKS: Record<string, { glyph: string; tone: string }> = {
  "windows-native": { glyph: "⊞", tone: "#3b82f6" },
  "windows-wsl2": { glyph: "⧉", tone: "#60a5fa" },
  linux: { glyph: "◆", tone: "#f59e0b" },
  macos: { glyph: "◌", tone: "#94a3b8" },
  remote: { glyph: "⌁", tone: "#22d3ee" },
  "windows-desktop": { glyph: "▣", tone: "#3b82f6" },
  "windows-console": { glyph: ">_", tone: "#64748b" },
  "linux-server": { glyph: "☰", tone: "#f59e0b" },
  "linux-desktop": { glyph: "▦", tone: "#fb923c" },
  web: { glyph: "◎", tone: "#38bdf8" },
  cpp: { glyph: "C+", tone: "#0ea5e9" },
  dotnet: { glyph: ".N", tone: "#a855f7" },
  rust: { glyph: "Rs", tone: "#f97316" },
  go: { glyph: "Go", tone: "#22d3ee" },
  python: { glyph: "Py", tone: "#eab308" },
  node: { glyph: "JS", tone: "#84cc16" },
  other: { glyph: "··", tone: "#94a3b8" },
  auto: { glyph: "?", tone: "#14b8a6" },
  msvc: { glyph: "VS", tone: "#3b82f6" },
  mingw: { glyph: "GW", tone: "#22c55e" },
  clang: { glyph: "CL", tone: "#a78bfa" },
  "gcc-native": { glyph: "GC", tone: "#f59e0b" },
  "native-host": { glyph: "⌂", tone: "#94a3b8" },
  "wsl-build": { glyph: "WS", tone: "#60a5fa" },
  "cross-on-host": { glyph: "⇄", tone: "#f472b6" },
  container: { glyph: "▢", tone: "#38bdf8" },
  "ci-only": { glyph: "CI", tone: "#94a3b8" },
};

export function optionMark(id: string): { glyph: string; tone: string } {
  return MARKS[id] ?? { glyph: id.slice(0, 2).toUpperCase(), tone: "#64748b" };
}
