// The terminal shows a real ESLint run over readme-demo/before, so its messages always match the rules.
import { ESLint } from "eslint";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import agenticDom from "../index.js";

const root = new URL("..", import.meta.url).pathname;
const demo = `${root}scripts/readme-demo`;

const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";

const THEMES = {
  light: {
    bg: "#ffffff", box: "#f6f8fa", line: "#d0d7de", text: "#1f2328", muted: "#656d76",
    accent: "#2563eb", brand: "#2563eb", good: "#15803d", red: "#dc2626", yellow: "#b45309",
  },
  dark: {
    bg: "#0d1117", box: "#161b22", line: "#30363d", text: "#e6edf3", muted: "#8d96a0",
    accent: "#3b82f6", brand: "#3b82f6", good: "#4ade80", red: "#f87171", yellow: "#fbbf24",
  },
};

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const svg = (width, height, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>\n`;

function wrap(text, width) {
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (line && line.length + 1 + word.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  return [...lines, line];
}

async function lint(dir) {
  const eslint = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: [agenticDom.configs.recommended] });
  return eslint.lintFiles([`${demo}/${dir}`]);
}

function logo(t) {
  const w = "#ffffff";
  const line = `fill="none" stroke="${w}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"`;
  return svg(96, 96,
    `<rect x="8" y="8" width="80" height="80" rx="20" fill="${t.brand}"/>` +
    `<path d="M48 26V19" ${line}/>` +
    `<circle cx="48" cy="15" r="4" fill="${w}"/>` +
    `<rect x="10" y="42" width="8" height="18" rx="3" fill="${w}"/>` +
    `<rect x="78" y="42" width="8" height="18" rx="3" fill="${w}"/>` +
    `<rect x="16" y="26" width="64" height="52" rx="14" fill="${w}"/>` +
    `<rect x="23" y="35" width="50" height="32" rx="8" fill="${t.brand}"/>` +
    `<path d="M38 43L31 51L38 59M58 43L65 51L58 59M51 41L45 61" ${line}/>`);
}

function top(t) {
  return svg(120, 36,
    `<rect x="0.5" y="0.5" width="119" height="35" rx="17.5" fill="${t.box}" stroke="${t.line}"/>` +
    `<text x="60" y="23" text-anchor="middle" style="font:600 14px ${SANS}" fill="${t.text}">Back to top</text>`);
}

function terminalLines(results) {
  const pad = " ".repeat(18);
  const lines = [[["p", "$ "], ["c", "npx eslint src"]], []];
  let errors = 0;
  let warnings = 0;
  for (const result of results) {
    if (!result.messages.length) continue;
    lines.push([["h", `src/components/${basename(result.filePath)}`]]);
    for (const m of result.messages) {
      const level = m.severity === 2 ? "error" : "warning";
      if (m.severity === 2) errors++;
      else warnings++;
      // Stylish, the default formatter, drops the closing period.
      const [first, ...rest] = wrap(m.message.replace(/([^ ])\.$/u, "$1"), 93);
      lines.push([["d", `  ${`${m.line}:${m.column}`.padEnd(6)}`], [m.severity === 2 ? "e" : "w", level.padEnd(10)], ["o", first]]);
      for (const more of rest) lines.push([["o", pad + more]]);
      lines.push([["d", pad + m.ruleId]]);
    }
    lines.push([]);
  }
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  lines.push([["e", `✖ ${plural(errors + warnings, "problem")} (${plural(errors, "error")}, ${plural(warnings, "warning")})`]]);
  return lines;
}

const AFTER = [
  [],
  [["m", "# Your coding agent applies each message: htmlFor and id, aria-describedby, aria-label."]],
  [["p", "$ "], ["c", "npx eslint src"]],
  [["m", "# No output. Every file passes."]],
];

function terminal(t, lines) {
  const lh = 18;
  const topY = 64;
  const height = topY + (lines.length + AFTER.length) * lh + 24;
  const cycle = 16;
  const keys = [];
  const anim = (name, start) => {
    keys.push(`@keyframes ${name}{0%,${start}%{opacity:0}${start + 1.5}%,95%{opacity:1}98%,100%{opacity:0}}`);
    return `style="opacity:0;animation:${name} ${cycle}s infinite"`;
  };
  const row = (i, segs) =>
    `<text class="l" x="24" y="${topY + i * lh}">${segs.map(([c, s]) => `<tspan class="${c}">${esc(s)}</tspan>`).join("")}</text>`;
  const body = [row(0, lines[0])];
  const output = lines.map((segs, i) => (i > 0 && segs.length ? row(i, segs) : "")).join("");
  body.push(`<g ${anim("a0", 6)}>${output}</g>`);
  const steps = [40, 52, 64, 72];
  AFTER.forEach((segs, k) => {
    if (segs.length) body.push(`<g ${anim(`a${k + 1}`, steps[k])}>${row(lines.length + k, segs)}</g>`);
  });
  const style =
    `.l{font:12.5px ${MONO};white-space:pre;fill:${t.text}}.p{fill:${t.good};font-weight:700}` +
    `.c{font-weight:700}.h{text-decoration:underline}.d{fill:${t.muted}}.e{fill:${t.red};font-weight:700}` +
    `.w{fill:${t.yellow};font-weight:700}.m{fill:${t.muted};font-style:italic}.ttl{font:600 12px ${SANS};fill:${t.muted}}`;
  const chrome =
    `<rect x="0.5" y="0.5" width="899" height="${height - 1}" rx="10" fill="${t.bg}" stroke="${t.line}"/>` +
    `<path d="M0.5 36V10.5a10 10 0 0 1 10-10h879a10 10 0 0 1 10 10V36z" fill="${t.box}"/>` +
    `<path d="M0.5 36H899.5" stroke="${t.line}"/>` +
    `<circle cx="22" cy="18" r="6" fill="#ff5f57"/><circle cx="42" cy="18" r="6" fill="#febc2e"/>` +
    `<circle cx="62" cy="18" r="6" fill="#28c840"/><text class="ttl" x="450" y="22" text-anchor="middle">my-app</text>`;
  return svg(900, height,
    `<style>${style}${keys.join("")}</style>${chrome}${body.join("")}`);
}

function flow(t) {
  const cycle = 10;
  const W = 170;
  const H = 104;
  const Y = 40;
  const boxes = [
    [16, "YOUR CODE", "A field with a label", [["cd", "<span>{label}</span>"], ["cd", "<input />"]]],
    [296, "THE MESSAGE", "Says what to add", [["u", "what an agent sees"], ["u", "and the fix"]]],
    [505, "YOUR CODING AGENT", "Adds it", [["cd", "<label htmlFor={id}>"], ["cd", "<input id={id} />"]]],
    [714, "A BROWSER AGENT", "Finds the field", [["cd", 'textbox "Email"']]],
  ];
  const keys = [];
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const x1 = boxes[i][0] + W;
    const x2 = boxes[i + 1][0];
    const start = 8 + i * 24;
    parts.push(`<path d="M${x1} ${Y + H / 2}H${x2}" stroke="${t.line}" stroke-width="2"/>`);
    keys.push(
      `@keyframes d${i}{0%,${start}%{transform:translateX(0);opacity:0}${start + 2}%{opacity:1}` +
        `${start + 12}%{transform:translateX(${x2 - x1}px);opacity:1}${start + 14}%,100%{transform:translateX(${x2 - x1}px);opacity:0}}`);
    parts.push(`<circle cx="${x1}" cy="${Y + H / 2}" r="5" fill="${t.accent}" style="opacity:0;animation:d${i} ${cycle}s infinite"/>`);
  }
  boxes.forEach(([x, kicker, title, rows], i) => {
    const on = i === 0 ? 0 : 20 + (i - 1) * 24;
    keys.push(`@keyframes g${i}{0%,${on}%{opacity:0}${on + 2}%,90%{opacity:1}96%,100%{opacity:0}}`);
    parts.push(
      `<rect x="${x}" y="${Y}" width="${W}" height="${H}" rx="10" fill="${t.box}" stroke="${t.line}"/>` +
        `<rect x="${x}" y="${Y}" width="${W}" height="${H}" rx="10" fill="none" stroke="${t.good}" stroke-width="2" style="opacity:0;animation:g${i} ${cycle}s infinite"/>` +
        `<text class="k" x="${x + 14}" y="${Y + 24}">${esc(kicker)}</text>` +
        `<text class="t${i === 3 ? " a" : ""}" x="${x + 14}" y="${Y + 46}">${esc(title)}</text>` +
        rows.map(([c, s], j) => `<text class="${c}" x="${x + 14}" y="${Y + 68 + j * 16}">${esc(s)}</text>`).join(""));
  });
  const px = boxes[0][0] + W + (boxes[1][0] - boxes[0][0] - W) / 2;
  parts.push(`<rect x="${px - 34}" y="${Y + H / 2 - 38}" width="68" height="24" rx="12" fill="${t.good}"/>`);
  parts.push(`<text class="cmd" x="${px}" y="${Y + H / 2 - 21.5}" text-anchor="middle">eslint</text>`);
  const style =
    `.t{font:700 14px ${SANS};fill:${t.text}}.u{font:12px ${SANS};fill:${t.muted}}` +
    `.k{font:700 10.5px ${SANS};fill:${t.muted};letter-spacing:.08em}.cd{font:12px ${MONO};fill:${t.text}}` +
    `.a{fill:${t.good}}.cmd{font:700 13px ${MONO};fill:#ffffff}`;
  return svg(900, 184,
    `<style>${style}${keys.join("")}</style>${parts.join("")}`);
}

function hero(t) {
  const scenes = [
    { tab: "Unnamed field", see: { without: "field", with: "field" },
      without: { reads: [["textbox"]], thought: "Which field is this?" },
      with: { reads: [['textbox "Email"']], thought: "The email field." } },
    { tab: "Disabled button", see: { without: "pay", with: "payReason" },
      without: { reads: [['button "Pay"', "disabled"]], thought: "Why can't I pay?" },
      with: { reads: [['button "Pay"', 'disabled · "Add a card to pay."']], thought: "Add a card first." } },
    { tab: "Repeated buttons", see: { without: "rows", with: "rows" },
      without: { reads: [['button "Edit"'], ['button "Edit"'], ['button "Edit"']], thought: "Which one is Ben's?" },
      with: { reads: [['button "Edit Ana"'], ['button "Edit Ben"'], ['button "Edit Carl"']], thought: '"Edit Ben".' } },
  ];
  const W = 900;
  const BAR = 52;
  const RX = W / 2;
  const PW = RX - 20;
  const HEAD = BAR + 48;
  const height = HEAD + 148;
  const cycle = 48;
  const phase = 100 / (scenes.length * 2);
  const keys = [];
  let n = 0;
  const show = (from, to) => {
    const name = `s${n++}`;
    const a = (from * phase).toFixed(2);
    const b = (to * phase).toFixed(2);
    keys.push(`@keyframes ${name}{0%,${a}%{opacity:0}${(+a + 1).toFixed(2)}%,${(b - 1).toFixed(2)}%{opacity:1}${b}%,100%{opacity:0}}`);
    return `style="${from ? "opacity:0;" : ""}animation:${name} ${cycle}s infinite"`;
  };
  const box = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${t.box}" stroke="${t.line}"/>`;
  const lx = 24;
  const top = HEAD + 8;
  const ui = {
    field: `<text class="ul" x="${lx}" y="${top + 12}">Email</text>` +
      `<rect x="${lx}" y="${top + 22}" width="300" height="36" rx="6" fill="${t.bg}" stroke="${t.line}"/>`,
    pay: `${box(lx, top + 8, 120, 38)}<text class="ub" x="${lx + 60}" y="${top + 32}" text-anchor="middle">Pay</text>`,
    rows: ["Ana", "Ben", "Carl"].map((name, i) => {
      const y = top - 12 + i * 44;
      return (i ? `<path d="M${lx} ${y}H${PW - 28}" stroke="${t.line}"/>` : "") +
        `<text class="ul" x="${lx}" y="${y + 27}">${name}</text>${box(PW - 108, y + 7, 80, 30)}` +
        `<text class="ue" x="${PW - 68}" y="${y + 27}" text-anchor="middle">Edit</text>`;
    }).join(""),
  };
  ui.payReason = `${ui.pay}<text class="um" x="${lx}" y="${top + 76}">Add a card to pay.</text>`;
  const chip = (x, y, [code, note]) => {
    const w = code.length * 7.2 + 16;
    return `<rect x="${x}" y="${y}" width="${w}" height="22" rx="6" fill="${t.box}" stroke="${t.line}"/>` +
      `<text class="cd" x="${x + 8}" y="${y + 15}">${esc(code)}</text>` +
      (note ? `<text class="n" x="${x + w + 8}" y="${y + 15}">${esc(note)}</text>` : "");
  };
  const ask = (x, y, text) =>
    `<circle cx="${x + 9}" cy="${y - 5}" r="9" fill="${t.red}"/><text class="qi" x="${x + 9}" y="${y - 0.5}" text-anchor="middle">?</text>` +
    `<text class="q" x="${x + 26}" y="${y}">${esc(text)}</text>`;
  const ok = (x, y, text) =>
    `<circle cx="${x + 9}" cy="${y - 5}" r="9" fill="${t.good}"/>` +
    `<path d="M${x + 4.5} ${y - 5}l3 3 6-6.5" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<text class="a" x="${x + 26}" y="${y}">${esc(text)}</text>`;
  const pill = (side) => side === "with"
    ? `<rect x="${W - 166}" y="14" width="150" height="24" rx="12" fill="${t.good}"/><text class="pw" x="${W - 91}" y="30" text-anchor="middle">WITH AGENTIC-DOM</text>`
    : `<rect x="${W - 190}" y="14" width="174" height="24" rx="12" fill="${t.red}"/><text class="pw" x="${W - 103}" y="30" text-anchor="middle">WITHOUT AGENTIC-DOM</text>`;
  const card = `x="0.5" y="0.5" width="${W - 1}" height="${height - 1}" rx="10"`;
  let out = `<rect ${card} fill="${t.bg}" stroke="${t.line}"/>` +
    `<path d="M0.5 ${BAR}V10.5a10 10 0 0 1 10-10h${W - 21}a10 10 0 0 1 10 10V${BAR}z" fill="${t.box}"/>` +
    `<path d="M0.5 ${BAR}H${W - 0.5}M${RX} ${BAR}V${height - 0.5}" stroke="${t.line}"/>` +
    `<text class="k" x="${lx}" y="${BAR + 30}">WHAT YOU SEE</text><text class="k" x="${RX + 28}" y="${BAR + 30}">WHAT AN AI AGENT READS</text>` +
    `<circle cx="${RX}" cy="${HEAD + 56}" r="14" fill="${t.bg}" stroke="${t.line}"/>` +
    `<path d="M${RX - 6} ${HEAD + 56}H${RX + 6}m-5-5l5 5-5 5" fill="none" stroke="${t.muted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  scenes.forEach((scene, i) => {
    const same = scene.see.without === scene.see.with;
    if (same) out += `<g ${show(i * 2, i * 2 + 2)}>${ui[scene.see.without]}</g>`;
    ["without", "with"].forEach((side, s) => {
      const k = i * 2 + s;
      const { reads, thought } = scene[side];
      let g = pill(side);
      if (side === "with") g += `<rect ${card} fill="none" stroke="${t.good}" stroke-width="1.5"/>`;
      reads.forEach((c, j) => { g += chip(RX + 28, HEAD + 8 + j * 28, c); });
      g += (side === "with" ? ok : ask)(RX + 28, HEAD + 8 + reads.length * 28 + 20, thought);
      if (!same) g += ui[scene.see[side]];
      out += `<g ${show(k, k + 1)}>${g}</g>`;
    });
  });
  let tx = 16;
  scenes.forEach((scene, i) => {
    const w = scene.tab.length * 7.6 + 28;
    const a = (i * 2 * phase).toFixed(2);
    const b = ((i * 2 + 2) * phase).toFixed(2);
    keys.push(`@keyframes u${i}{0%,${a}%{transform:scaleX(0)}${b}%,100%{transform:scaleX(1)}}`);
    out += `<g ${show(i * 2, i * 2 + 2)}><rect x="${tx}" y="11" width="${w}" height="30" rx="15" fill="${t.brand}" opacity=".14"/>` +
      `<rect x="${tx + 14}" y="46" width="${w - 28}" height="3" rx="1.5" fill="${t.good}" style="transform-box:fill-box;transform-origin:left;animation:u${i} ${cycle}s linear infinite"/></g>` +
      `<text class="tab" x="${tx + w / 2}" y="31" text-anchor="middle">${scene.tab}</text>`;
    tx += w + 6;
  });
  const style =
    `.cd{font:12px ${MONO};fill:${t.text}}.n{font:13px ${SANS};fill:${t.muted}}` +
    `.q{font:italic 14px ${SANS};fill:${t.muted}}.a{font:700 14px ${SANS};fill:${t.good}}` +
    `.qi{font:700 12px ${SANS};fill:#ffffff}.k{font:700 12px ${SANS};letter-spacing:.08em;fill:${t.muted}}` +
    `.ul{font:600 14px ${SANS};fill:${t.text}}.um{font:13px ${SANS};fill:${t.muted}}` +
    `.ub{font:600 14px ${SANS};fill:${t.muted};opacity:.6}.ue{font:600 13px ${SANS};fill:${t.text}}` +
    `.pw{font:700 11px ${SANS};letter-spacing:.06em;fill:${t.bg}}` +
    `.tab{font:600 14px ${SANS};fill:${t.text}}`;
  return svg(W, height, `<style>${style}${keys.join("")}</style>${out}`);
}

const before = await lint("before");
const after = await lint("after");
if (before.some((r) => r.messages.length !== 1)) throw new Error("Each readme-demo/before file must get exactly one report.");
if (after.some((r) => r.messages.length)) throw new Error("readme-demo/after must lint clean.");
const readme = readFileSync(`${root}README.md`, "utf8");
for (const dir of ["before", "after"]) {
  for (const file of readdirSync(`${demo}/${dir}`)) {
    const code = readFileSync(`${demo}/${dir}/${file}`, "utf8").replace(/^import .*\n+/gmu, "").replace(/^export /gmu, "");
    if (!readme.includes(code)) throw new Error(`README.md must show readme-demo/${dir}/${file} without export and imports.`);
  }
}

const lines = terminalLines(before);
mkdirSync(`${root}assets`, { recursive: true });
for (const [name, t] of Object.entries(THEMES)) {
  writeFileSync(`${root}assets/logo-${name}.svg`, logo(t));
  writeFileSync(`${root}assets/top-${name}.svg`, top(t));
  writeFileSync(`${root}assets/terminal-${name}.svg`, terminal(t, lines));
  writeFileSync(`${root}assets/flow-${name}.svg`, flow(t));
  writeFileSync(`${root}assets/hero-${name}.svg`, hero(t));
}
