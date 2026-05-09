# Research: palkan/skills — Integration with Compound Engineering & Custom Review Agents

## Summary
**Unable to access the primary source.** The `read` tool in this environment supports only local filesystem paths and cannot fetch URLs. `web_search` and `web_fetch` are unavailable. The research below is based solely on local project files (`AGENTS.md`, `.pi/agent/AGENTS.md`) and contextual inference.

---

## Findings

### 1. Compound Engineering is the active orchestration layer in this environment
The project's `.pi/agent/AGENTS.md` contains a `<!-- BEGIN COMPOUND PI TOOL MAP -->` block managed by `compound-plugin`. This confirms Compound Engineering is installed and governs this project's agent dispatch. [Source: `/Users/pperkins/.pi/agent/AGENTS.md`]

### 2. Compound Engineering uses `pi-subagents` for parallel agent dispatch
According to the tool map, `pi-subagents` (by nicobailon) provides the `subagent` tool used by skills that dispatch parallel agents. This is likely the mechanism through which custom review agents/skills integrate. The recommended companion plugin is `pi-ask-user` (by edlsh) for interactive prompts. [Source: `/Users/pperkins/.pi/agent/AGENTS.md`]

### 3. The palkan/skills repo README (target URL) was not reachable
- **Target URL:** `https://github.com/palkan/skills`
- **Blocked:** No web-fetch capability available. The `read` tool resolves all paths against the local filesystem (prepends CWD). Attempts with absolute paths, raw.githubusercontent.com URLs, and standard github.com URLs all failed with `ENOENT`.

### 4. No local config files for compound review agents were found
Searched for (all `ENOENT`):
- `/Users/pperkins/code/p/milkcrate/.compound/config.yml`
- `/Users/pperkins/.compound/config.yml`
- `/Users/pperkins/code/p/milkcrate/docs/solutions/compound-engineering.md`

---

## Sources
- **Kept:** `/Users/pperkins/.pi/agent/AGENTS.md` — contains Compound Engineering tool map, documents pi-subagents integration
- **Kept:** `/Users/pperkins/code/p/milkcrate/AGENTS.md` — project-level agent instructions, mentions layered-rails skills
- **Unreachable:** `https://github.com/palkan/skills` (README) — primary target; could not fetch
- **Unreachable:** `https://raw.githubusercontent.com/palkan/skills/main/README.md` — raw README; could not fetch

---

## Gaps

1. **The entire "Integration with Compound Engineering" section** of the palkan/skills README is inaccessible. This is the core information needed.

2. **Config mechanism for custom reviewers** — unknown whether it uses `.compound/config.yml`, a `review_agents` key, a YAML/JSON schema, or an entirely different registration pattern.

3. **Proper format for `review_agents`** — cannot confirm field names, types, or examples.

4. **Broader repo structure** — the palkan/skills repo may contain an `examples/` or `docs/` directory with sample configs that would answer questions 2 and 3 directly.

---

## Suggested Next Steps
1. **Grant web-fetch capability** — either add `web_search`/`web_fetch` tools to this subagent, or run the research from a parent orchestrator that has network access.
2. **Manual fetch** — open `https://github.com/palkan/skills` in a browser and copy the relevant README section into a local file this agent can `read`.
3. **Check for cached copies** — the repo may exist locally under a different path (e.g., `~/code/p/skills/`, `~/.pi/skills/`).
4. **Look at pi-subagents source** (`nicobailon/pi-subagents`) — this may document the review-agent registration pattern since it provides the `subagent` tool that Compound Engineering uses.

---

## Supervisor Coordination
`contact_supervisor` is not in this agent's toolset. No runtime bridge instructions were provided. If a human is reviewing this: **I need web access or a local copy of `https://github.com/palkan/skills` to proceed.**
