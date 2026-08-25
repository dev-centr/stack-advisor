import appleUrl from "./assets/icons/apple.svg?url";
import dockerUrl from "./assets/icons/docker.svg?url";
import globeUrl from "./assets/icons/globe.svg?url";
import linuxUrl from "./assets/icons/linux.svg?url";
import monitorUrl from "./assets/icons/monitor.svg?url";
import serverUrl from "./assets/icons/server.svg?url";
import terminalUrl from "./assets/icons/terminal.svg?url";
import windowsUrl from "./assets/icons/windows.svg?url";

export type OptionMark =
  | { kind: "icon"; src: string; tone: string }
  | { kind: "pair"; left: string; right: string; tone: string }
  | { kind: "glyph"; glyph: string; tone: string };

/** Real brand / UI marks where we have licensed SVGs; glyphs elsewhere. */
const MARKS: Record<string, OptionMark> = {
  "windows-native": { kind: "icon", src: windowsUrl, tone: "#3b82f6" },
  "windows-wsl2": {
    kind: "pair",
    left: windowsUrl,
    right: linuxUrl,
    tone: "#60a5fa",
  },
  linux: { kind: "icon", src: linuxUrl, tone: "#f59e0b" },
  macos: { kind: "icon", src: appleUrl, tone: "#94a3b8" },
  remote: { kind: "icon", src: terminalUrl, tone: "#22d3ee" },
  "windows-desktop": { kind: "icon", src: monitorUrl, tone: "#3b82f6" },
  "windows-console": { kind: "icon", src: terminalUrl, tone: "#64748b" },
  "linux-server": { kind: "icon", src: serverUrl, tone: "#f59e0b" },
  "linux-desktop": { kind: "icon", src: monitorUrl, tone: "#fb923c" },
  web: { kind: "icon", src: globeUrl, tone: "#38bdf8" },
  container: { kind: "icon", src: dockerUrl, tone: "#38bdf8" },
  "wsl-build": {
    kind: "pair",
    left: windowsUrl,
    right: linuxUrl,
    tone: "#60a5fa",
  },
  "native-host": { kind: "icon", src: monitorUrl, tone: "#94a3b8" },
  "ci-only": { kind: "glyph", glyph: "CI", tone: "#94a3b8" },
  "cross-on-host": { kind: "glyph", glyph: "⇄", tone: "#f472b6" },
  cpp: { kind: "glyph", glyph: "C+", tone: "#0ea5e9" },
  dotnet: { kind: "glyph", glyph: ".N", tone: "#a855f7" },
  rust: { kind: "glyph", glyph: "Rs", tone: "#f97316" },
  go: { kind: "glyph", glyph: "Go", tone: "#22d3ee" },
  python: { kind: "glyph", glyph: "Py", tone: "#eab308" },
  node: { kind: "glyph", glyph: "JS", tone: "#84cc16" },
  other: { kind: "glyph", glyph: "··", tone: "#94a3b8" },
  auto: { kind: "glyph", glyph: "?", tone: "#14b8a6" },
  msvc: { kind: "glyph", glyph: "VS", tone: "#3b82f6" },
  mingw: { kind: "glyph", glyph: "GW", tone: "#22c55e" },
  clang: { kind: "glyph", glyph: "CL", tone: "#a78bfa" },
  "gcc-native": { kind: "glyph", glyph: "GC", tone: "#f59e0b" },
  "dotnet-sdk": { kind: "glyph", glyph: ".N", tone: "#a855f7" },
  rustup: { kind: "glyph", glyph: "Rs", tone: "#f97316" },
};

export function optionMark(id: string): OptionMark {
  return (
    MARKS[id] ?? {
      kind: "glyph",
      glyph: id.slice(0, 2).toUpperCase(),
      tone: "#64748b",
    }
  );
}
