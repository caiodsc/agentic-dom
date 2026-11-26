import { ruleTester } from "./setup.js";
import rule from "../lib/rules/collapsed-content-inert.js";

const reported = (when, element = "div") => [{ messageId: "notInert", data: { element, when } }];

ruleTester.run("collapsed-content-inert", rule, {
  valid: [
    `<div className={open ? "max-h-96" : "max-h-0"} inert={!open}>{children}</div>`,
    { name: "inert with no value", code: `<div className={c ? "h-0" : ""} inert>{children}</div>` },
    { name: "hidden", code: `<div className={c ? "h-0" : ""} hidden={c}>{children}</div>` },
    { name: "spread may set inert", code: `<div {...props} className={c ? "h-0" : ""}>{children}</div>` },
    { name: "component, which may not pass inert on", code: `<Panel className={c ? "h-0" : ""}>{children}</Panel>` },
    { name: "member element", code: `<motion.div className={c ? "h-0" : ""}>{children}</motion.div>` },
    { name: "no content", code: `<div className={c ? "h-0" : ""} />` },
    { name: "always collapsed", code: `<div className="h-0 w-full">{children}</div>` },
    { name: "collapsed on both sides", code: `<div className={c ? "max-h-0" : "h-0"}>{children}</div>` },
    { name: "no collapse class", code: `<div className={c ? "flex" : "hidden"}>{children}</div>` },
    { name: "similar class names", code: `<div className={c ? "min-h-0 h-0.5" : "md:max-h-0"}>{children}</div>` },
    { name: "opacity only", code: `<div className={c ? "opacity-0" : "opacity-100"}>{children}</div>` },
    { name: "class from a variable", code: `<div className={classes}>{children}</div>` },
    { name: "collapse class on the falsy side of ||", code: `<div className={c || "h-0"}>{children}</div>` },
    { name: "object keys that are not collapse classes", code: `<div className={cn({ [key]: c, flex: c, ...rest })}>{children}</div>` },
    { name: "other collapse classes set", code: `<div className={c ? "h-0" : ""}>{children}</div>`, options: [{ collapseClasses: ["collapsed"] }] },
  ],
  invalid: [
    {
      code: `<div className={isCollapsed ? "max-h-0 opacity-0" : "max-h-none"}>{children}</div>`,
      errors: reported("isCollapsed"),
    },
    { name: "collapsed on the false side", code: `<div className={expanded ? "max-h-96" : "max-h-0"}>{children}</div>`, errors: reported("!expanded") },
    { name: "negated condition", code: `<section className={!open ? "max-h-96" : "h-0"}>{children}</section>`, errors: reported("open", "section") },
    { name: "member condition", code: `<div className={state.open ? "" : "h-0"}>{children}</div>`, errors: reported("!state.open") },
    { name: "compound condition", code: `<div className={a && b ? "" : "h-0"}>{children}</div>`, errors: reported("!(a && b)") },
    { name: "&&", code: `<div className={collapsed && "h-0"}>{children}</div>`, errors: reported("collapsed") },
    { name: "template literal", code: "<div className={`overflow-hidden ${c ? `max-h-0` : \"max-h-96\"}`}>{children}</div>", errors: reported("c") },
    { name: "class helper", code: `<div className={twMerge("overflow-hidden", c ? "max-h-0" : "max-h-96")}>{children}</div>`, errors: reported("c") },
    { name: "array", code: `<div className={cn(["overflow-hidden", c && "h-0"])}>{children}</div>`, errors: reported("c") },
    { name: "object", code: `<div className={clsx({ "max-h-0": collapsed })}>{children}</div>`, errors: reported("collapsed") },
    { name: "string concatenation", code: `<div className={"overflow-hidden " + (c ? "h-0" : "")}>{children}</div>`, errors: reported("c") },
    { name: "nested ternary", code: `<div className={a ? "flex" : b ? "h-0" : "block"}>{children}</div>`, errors: reported("b") },
    { name: "|| before the collapse", code: `<div className={x || (c ? "h-0" : "")}>{children}</div>`, errors: reported("c") },
    { name: "inert React drops", code: `<div className={c ? "h-0" : ""} inert={false}>{children}</div>`, errors: reported("c") },
    { name: "aria-hidden leaves it focusable", code: `<div className={c ? "h-0" : ""} aria-hidden={c}>{children}</div>`, errors: reported("c") },
    { name: "class attribute", code: `<div class={c ? "h-0" : ""}>{children}</div>`, errors: reported("c") },
    { name: "other collapse classes", code: `<div className={c ? "collapsed" : ""}>{children}</div>`, options: [{ collapseClasses: ["collapsed"] }], errors: reported("c") },
  ],
});
