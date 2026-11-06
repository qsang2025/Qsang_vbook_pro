---
name: vbook-extensions
description: Create, fix, test, audit, refactor, build, or install vBook extensions against the current engine API and ScriptExecutor runtime. Use for extension source, plugin.json, vBook REST testing, packaging, or installation.
---

# vBook extensions (Qsang_vbook_pro Framework)

Canonical, agentic development skill for `Qsang_vbook_pro`.
Before writing or modifying any script, read:
- **`reference/extension-api.md`** — Official 2,336-line API contract, field specifications, JS bridge API surface.
- **`reference/runtime.md`** — Strict Rhino ES6 runtime constraints and jsoup rules.
- **`reference/type-contracts.md`** — Specific contract per extension type (`novel`, `chinese_novel`, `comic`, `video`, `audio`, `translate`, `tts`, `ai`).
- **`reference/cli.md`** — Usage guide for `scripts/cli.js` and `scripts/vbook.js`.
- **`reference/verify-checklist.md`** — Step-by-step verification checklist.

## Route the task

Read exactly one matching mode when source work or testing is requested:

- New extension or bare source URL → [CREATE](modes/create.md).
- Repair, domain/selector change, API migration, or feature change → [FIX](modes/fix.md).
- Read-only test of one extension/script → [TEST](modes/test.md).
- Repo-wide or named-subset health scan → [AUDIT](modes/audit.md).
- Behavior-preserving template alignment → [REFACTOR](modes/refactor.md).

## Architecture & Layout

Extensions reside in:
`extensions/<type>/<name>/`
  - `plugin.json` (metadata & script routing)
  - `icon.png` (200x200 extension icon)
  - `test.json` (golden fixture test cases for CI health monitoring)
  - `src/*.js` (runnable scripts: `execute(args)`)

## Shared Helpers in `lib/`

1. **`lib/fetch-helpers.js`**:
   - `FetchPro.request(urlOrPath, options)`: automatic mirror failover, HTTP 429 rate limit backoff using `Retry-After` header and `sleep(ms)`.
   - `FetchPro.postNextAction(url, actionId, payload)`: POST helper with custom `Next-Action` header and JSON body for Next.js sites.
   - `FetchPro.postJson(url, data)` / `FetchPro.postForm(url, data)`.
2. **`lib/config-helpers.js`**:
   - `ConfigHelpers.normalizeUrl(url, baseUrl)`: rewrites incoming URL host to current `BASE_URL`.
   - `ConfigHelpers.getConfig(key, defaultVal)`: safe retrieval of injected settings without ReferenceError.
   - `ConfigHelpers.formatDetail(title, author, extra, locale)`: conforms strictly to Rule 9 (first line title, second line author in target locale).
3. **`lib/cleanHtml.js`**:
   - `CleanHtml.clean(htmlOrElement, options)`: strips scripts, iframes, tracking, removes ads, normalizes paragraphs and line breaks.
4. **`lib/gbk.js`**:
   - `GBK.encodeURI(str)`: encodes search queries for legacy Chinese novel sites.

> **CRITICAL ENGINE CONSTRAINT:**
> vBook's `load()` only resolves files at the top level of `src/` inside the same extension. It is NOT recursive, and loaded files cannot load other files.
> During build (`node scripts/cli.js build`), the builder automatically detects `load('foo.js')` calls and copies necessary files from `lib/` into the extension's `src/` before creating `plugin.zip`.
> The validator (`node scripts/cli.js validate`) verifies that `plugin.zip` contains all bundled libraries.

## CLI Commands

```bash
# Validate Rhino ES6 syntax, manifest schemas, and lib dependencies
node scripts/cli.js validate

# Build extension(s), bundle lib dependencies, package plugin.zip
node scripts/cli.js build [extensions/<type>/<name>]

# Regenerate root plugin.json registry
node scripts/cli.js build-catalog

# Run health checks against live sources and golden fixtures, update STATUS.md
node scripts/cli.js health-check

# Connect to vBook Developer Server on phone
node scripts/cli.js connect

# Test a script against phone developer server
node scripts/cli.js test extensions/novel/example search.js "tien" 1
```

## Mandatory Rules

1. **Rhino ES6 only:** `var` / `function` only, string concatenation with `+`.
   NEVER use: `async`/`await`, `() => {}`, template literals, optional chaining (`?.`), spread (`...`), `flat`/`flatMap`.
2. **Errors returned via `Response.error`:** Always provide descriptive Vietnamese message on failure. Never return `null`.
3. **No default encryption:** `encrypt: false` in `plugin.json`. Code in git must be readable.
4. **No secrets:** Never commit tokens, cookies, or real credentials.
5. **No zip artifacts in git:** `plugin.zip` is built on demand; blocked by `.gitignore`.
6. **Bump version:** Bump version in extension manifest and regenerate `plugin.json` registry on every change.
