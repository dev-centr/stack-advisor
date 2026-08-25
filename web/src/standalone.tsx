/* @refresh reload */
import { render } from "solid-js/web";
import { ToolchainBrowser } from "./Browser";
import "./browser.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root missing");

render(
  () => (
    <div class="tb-standalone-shell">
      <p class="tb-brand">DevCentr · Toolchain</p>
      <h1>Toolchain Browser</h1>
      <p class="tb-lede">
        Browse host, target, language, and toolchain. Advice is built into the
        flow—same SDL definitions as DevCentr desktop.
      </p>
      <ToolchainBrowser
        embed="standalone"
        catalogPath={`${import.meta.env.BASE_URL}catalog/advisor.json`}
      />
      <p class="tb-source">
        <a href="https://devcentr.org/toolchain-browser">Back to DevCentr.org</a>
      </p>
    </div>
  ),
  root,
);
