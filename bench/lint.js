import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

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
