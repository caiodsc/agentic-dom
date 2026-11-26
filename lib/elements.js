const { elementName, getAttr, attrValue } = require("./jsx.js");

const BUTTON_INPUT_TYPES = new Set(["button", "submit", "reset", "image"]);

// A lowercase name like `ui.Checkbox` is a member of an object, so a component.
const isNativeTag = (name) => /^[a-z]/.test(name) && !name.includes(".");

// What an element is to an agent: "button", "link", "checkbox" for a component, the settings map's `as` as written, or null.
function resolveKind(opening, context) {
  const name = elementName(opening);
  const map = context.settings?.["agentic-dom"]?.components ?? {};
  if (map[name]?.as) return map[name].as;

  const role = attrValue(getAttr(opening, "role"));
  if (role === "button" || role === "link") return role;

  if (isNativeTag(name)) {
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
  if (/Checkbox$/.test(last)) return "checkbox";
  return null;
}

module.exports = { BUTTON_INPUT_TYPES, isNativeTag, resolveKind };
