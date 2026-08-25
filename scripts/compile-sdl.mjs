/**
 * Compiles catalog/advisor.sdl → catalog/advisor.json (toolchain-advisor schema only).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sdlPath = process.argv[2] ?? join(root, "catalog", "advisor.sdl");
const outPath = process.argv[3] ?? join(root, "catalog", "advisor.json");

function stripComments(text) {
  // Only full-line comments — do not strip // inside URLs in quoted strings.
  return text.replace(/^\s*\/\/[^\n]*$/gm, "");
}

function unquote(s) {
  return s.replace(/\\"/g, '"');
}

function tagValues(block, name) {
  const t = block.rawTags?.find((x) => x.name === name);
  return t ? [...t.values] : [];
}

/** Parse one or more SDL tags on a line (e.g. `id "cpp" label "C / C++"`). */
function parseTagLine(block, line) {
  let pos = 0;
  while (pos < line.length) {
    while (pos < line.length && /\s/.test(line[pos])) pos++;
    if (pos >= line.length) break;

    const tagMatch = /^([a-zA-Z][a-zA-Z0-9]*)/.exec(line.slice(pos));
    if (!tagMatch) break;
    const tagName = tagMatch[1];
    pos += tagMatch[0].length;
    while (pos < line.length && /\s/.test(line[pos])) pos++;

    if (line.slice(pos, pos + 3) === '"""') {
      const after = line.slice(pos + 3);
      const end = after.indexOf('"""');
      const content = end >= 0 ? after.slice(0, end) : after;
      block.rawTags.push({ name: tagName, values: [content.trim()] });
      pos = end >= 0 ? pos + 3 + end + 3 : line.length;
      continue;
    }

    const values = [];
    while (pos < line.length) {
      while (pos < line.length && /\s/.test(line[pos])) pos++;
      if (pos >= line.length) break;
      // Next identifier starts another tag on this line.
      if (line[pos] !== '"' && /^[a-zA-Z_]/.test(line[pos])) break;
      if (line[pos] === '"') {
        pos++;
        let raw = "";
        while (pos < line.length && line[pos] !== '"') {
          if (line[pos] === "\\") {
            pos++;
            if (pos < line.length) raw += line[pos++];
            continue;
          }
          raw += line[pos++];
        }
        if (pos < line.length && line[pos] === '"') pos++;
        values.push(unquote(raw));
        continue;
      }
      // Unquoted token (e.g. version 1).
      const tok = /^[^\s"]+/.exec(line.slice(pos));
      if (!tok) break;
      values.push(tok[0]);
      pos += tok[0].length;
    }
    block.rawTags.push({ name: tagName, values });
  }
}

function findLineEnd(body, pos) {
  let i = pos;
  while (i < body.length) {
    if (body[i] === '"') {
      i++;
      if (body[i] === '"' && body[i + 1] === '"') {
        i += 3;
        while (i < body.length && !(body[i] === '"' && body[i + 1] === '"' && body[i + 2] === '"')) i++;
        i += 3;
        continue;
      }
      while (i < body.length && body[i] !== '"') {
        if (body[i] === "\\") i++;
        i++;
      }
      i++;
      continue;
    }
    if (body[i] === "{") break;
    if (body[i] === "\n") {
      i++;
      break;
    }
    i++;
  }
  return i;
}

function parseBody(block, body) {
  let pos = 0;
  while (pos < body.length) {
    while (pos < body.length && /\s/.test(body[pos])) pos++;
    if (pos >= body.length) break;

    const nmMatch = /^([a-zA-Z][a-zA-Z0-9]*)/.exec(body.slice(pos));
    if (!nmMatch) break;
    const nm = nmMatch[1];
    let p = pos + nm.length;
    while (p < body.length && /\s/.test(body[p])) p++;

    if (body[p] === "{") {
      const sub = parseBlock(body.slice(pos), 0);
      pos = pos + sub.end;
      if (!block.children[nm]) block.children[nm] = [];
      block.children[nm].push(sub.block);
      continue;
    }

    const lineEnd = findLineEnd(body, pos);
    const line = body.slice(pos, lineEnd).trim();
    pos = lineEnd;
    if (line) parseTagLine(block, line);
  }
}

function parseBlock(src, start) {
  let i = start;
  while (i < src.length && /\s/.test(src[i])) i++;
  const nameMatch = /^([a-zA-Z][a-zA-Z0-9]*)/.exec(src.slice(i));
  if (!nameMatch) throw new Error(`Expected block name at ${i}`);
  const name = nameMatch[1];
  i += name.length;
  while (i < src.length && /\s/.test(src[i])) i++;
  if (src[i] !== "{") throw new Error(`Expected { after ${name} at ${i}`);
  i++;

  const bodyStart = i;
  let depth = 1;
  while (i < src.length && depth > 0) {
    const ch = src[i];
    if (ch === '"') {
      i++;
      if (src[i] === '"' && src[i + 1] === '"') {
        i += 3;
        while (i < src.length && !(src[i] === '"' && src[i + 1] === '"' && src[i + 2] === '"')) i++;
        i += 3;
        continue;
      }
      while (i < src.length && src[i] !== '"') {
        if (src[i] === "\\") i++;
        i++;
      }
      i++;
      continue;
    }
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    if (depth > 0) i++;
  }

  const body = src.slice(bodyStart, i - 1);
  i++;
  const block = { name, rawTags: [], children: {} };
  parseBody(block, body);
  return { block, end: i };
}

function parseOption(block) {
  const opt = {
    id: tagValues(block, "id")[0] ?? "",
    label: tagValues(block, "label")[0] ?? "",
    era: tagValues(block, "era")[0] ?? "",
    overview: tagValues(block, "overview")[0] ?? "",
    timeline: [],
    alternates: [],
  };

  const tl = block.children.timeline?.[0];
  if (tl) {
    for (const m of tl.children.milestone ?? []) {
      opt.timeline.push({
        period: tagValues(m, "period")[0] ?? "",
        title: tagValues(m, "title")[0] ?? "",
        summary: tagValues(m, "summary")[0] ?? "",
      });
    }
  }

  for (const alt of block.children.alternate ?? []) {
    opt.alternates.push({
      versus: tagValues(alt, "versus")[0] ?? "",
      title: tagValues(alt, "title")[0] ?? "",
      summary: tagValues(alt, "summary")[0] ?? "",
      preferWhen: tagValues(alt, "preferWhen")[0] ?? "",
      problemsSolved: tagValues(alt, "problemsSolved")[0] ?? "",
    });
  }

  return opt;
}

function parseRecommendation(block) {
  const rec = {
    id: tagValues(block, "id")[0] ?? "",
    title: tagValues(block, "title")[0] ?? "",
    summary: tagValues(block, "summary")[0] ?? "",
    docs: tagValues(block, "docs")[0] ?? "",
    tooling: tagValues(block, "tooling"),
    caveats: tagValues(block, "caveats"),
    match: {},
  };

  const matchBlock = block.children.match?.[0];
  if (matchBlock) {
    for (const t of matchBlock.rawTags ?? []) {
      rec.match[t.name] = t.values;
    }
  }
  return rec;
}

function parseSdl(text) {
  const src = stripComments(text);
  const { block: rootBlock } = parseBlock(src, 0);
  const ta = rootBlock.children.toolchainAdvisor?.[0] ?? rootBlock;

  const versionVal = tagValues(ta, "version")[0];
  const catalog = {
    version: versionVal ? Number(versionVal) : 1,
    steps: [],
    recommendations: [],
  };

  const stepsWrap = ta.children.steps?.[0];
  if (stepsWrap) {
    for (const step of stepsWrap.children.step ?? []) {
      const modeRaw = (tagValues(step, "selectionMode")[0] ?? "single").toLowerCase();
      catalog.steps.push({
        id: tagValues(step, "id")[0] ?? "",
        title: tagValues(step, "title")[0] ?? "",
        hint: tagValues(step, "hint")[0] ?? "",
        selectionMode: modeRaw === "multi" ? "multi" : "single",
        options: (step.children.option ?? []).map(parseOption),
      });
    }
  }

  const recWrap = ta.children.recommendations?.[0];
  if (recWrap) {
    for (const rec of recWrap.children.recommendation ?? []) {
      catalog.recommendations.push(parseRecommendation(rec));
    }
  }

  return catalog;
}

const catalog = parseSdl(readFileSync(sdlPath, "utf8"));
writeFileSync(outPath, JSON.stringify(catalog, null, 2) + "\n");
console.log(`Wrote ${outPath} (${catalog.steps.length} steps, ${catalog.recommendations.length} rules)`);
