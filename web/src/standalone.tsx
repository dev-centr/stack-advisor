/* @refresh reload */
import { render } from "solid-js/web";
import { StackAdvisor } from "./Browser";
import "./browser.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root missing");

render(
  () => (
    <div class="tb-standalone-shell">
      <p class="tb-brand">DevCentr · Stack</p>
      <h1>Stack Advisor</h1>
      <p class="tb-lede">
        Choose a host · target · language · toolchain stack. A sample path is
        preloaded; clear levels with ×. Same SDL definitions as DevCentr desktop.
      </p>
      <StackAdvisor
        embed="standalone"
        catalogPath={`${import.meta.env.BASE_URL}catalog/advisor.json`}
      />
      <p class="tb-source">
        <a href="https://devcentr.org/stack-advisor">Back to DevCentr.org</a>
      </p>
    </div>
  ),
  root,
);
