# AGENTS.md

## Philosophy

**Prefer predictable static analysis over speculative coverage.**

It is better to detect 70% of cases with high confidence than to chase 100% coverage and annoy developers with false positives.

When uncertain, prefer skipping a diagnostic over reporting a potentially valid pattern.

## Focus

Build **agent-readiness linting**, not another general-purpose accessibility plugin.

Focus exclusively on problems that make AI browser agents struggle to identify, distinguish, understand, or operate UI elements.

## Guidelines

- Prioritize precision over coverage.
- Never confuse dynamic values with unique values.
- Respect HTML and ARIA semantics.
- Every rule must address a real agent interaction problem.
- Keep implementations simple and diagnostics actionable.
- Test both reported problems and valid patterns that must not be reported.
- Document limitations honestly.
- Avoid speculative heuristics and unnecessary abstractions.

**Build tools that make interfaces easier for agents to operate, not tools that merely produce more warnings.**
