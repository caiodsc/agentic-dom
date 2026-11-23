const { elementName, getAttr, attrValue } = require("./jsx.js");

const BUTTON_INPUT_TYPES = new Set(["button", "submit", "reset", "image"]);

// What an element is to an agent: "button", "link", the settings map's `as` as written, or null.
function resolveKind(opening, context) {
  const name = elementName(opening);
  const map = context.settings?.["agentic-dom"]?.components ?? {};
  if (map[name]?.as) return map[name].as;

  const role = attrValue(getAttr(opening, "role"));
  if (role === "button" || role === "link") return role;

  if (/^[a-z]/.test(name)) {
    if (name === "button") return "button";
    if (name === "a") {
      // React drops an href set to null or a boolean, leaving no destination.
      const href = attrValue(getAttr(opening, "href"));
      return href === undefined || href === null || typeof href === "boolean" ? null : "link";
    }
    if (name === "input") {
      const type = attrValue(getAttr(opening, "type"));
      if (typeof type === "string" && BUTTON_INPUT_TYPES.has(type.toLowerCase())) return "button";
      return null;
    }
    return null;
  }

  const last = name.split(".").pop();
  if (/Button$/.test(last)) return "button";
  if (/Link$/.test(last)) return "link";
  return null;
}

module.exports = { BUTTON_INPUT_TYPES, resolveKind };
