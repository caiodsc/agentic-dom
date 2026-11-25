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
- Read every JSX value the way React renders it. A value React drops or renders as nothing counts as absent.
- Every rule must address a real agent interaction problem.
- Keep implementations simple and diagnostics actionable.
- Test both reported problems and valid patterns that must not be reported.
- Document limitations honestly.
- Every sentence in the docs matches what the code does today, and a change in behavior updates those sentences in the same PR.
- A rule page's "Not reported" list is a decision. A pattern listed there stays skipped until that list changes first.
- Avoid speculative heuristics and unnecessary abstractions.
- A rule passes only the fixes its page lists, the ones an agent reads reliably, and reports weaker ways to say the same thing, even when that adds warnings.

**Build tools that make interfaces easier for agents to operate, not tools that merely produce more warnings.**
