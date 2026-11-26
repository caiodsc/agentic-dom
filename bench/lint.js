import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative } from "node:path";

// Lints the app's sources with every agentic-dom rule from `lib` (and that checkout's ESLint), using the app's own TypeScript parser.
export function makeLinter(app, lib) {
  const require = createRequire(join(app, "package.json"));
  const parser = require("@typescript-eslint/parser");
  const fromLib = createRequire(join(lib, "package.json"));
  const plugin = fromLib("./index.cjs");
  const { Linter } = fromLib("eslint");
  const linter = new Linter({ configType: "flat", cwd: app });
  const config = [{
    files: ["**/*.{js,jsx,tsx}"],
    languageOptions: { parser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { "agentic-dom": plugin },
    rules: Object.fromEntries(Object.keys(plugin.rules).map((r) => [`agentic-dom/${r}`, "warn"])),
  }];
  const lintSource = (path, source) => {
    const messages = linter.verify(source, config, { filename: path });
    if (messages.some((m) => m.fatal)) throw new Error(`${path} did not parse: ${messages.find((m) => m.fatal).message}`);
    return messages.filter((m) => m.ruleId?.startsWith("agentic-dom/"));
  };
  return { parser, lintSource };
}

export function sourceFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(path, out);
    else if (/\.(jsx|tsx)$/.test(entry.name)) out.push(path);
  }
  return out;
}

export function lintApp(app, lib) {
  const { lintSource } = makeLinter(app, lib);
  const reports = [];
  for (const path of sourceFiles(join(app, "src"))) {
    for (const m of lintSource(path, readFileSync(path, "utf8"))) {
      reports.push({ rule: m.ruleId.replace("agentic-dom/", ""), at: `${relative(app, path)}:${m.line}` });
    }
  }
  return reports;
}
