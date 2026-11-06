# Runtime rules

Read before creating or editing extension JavaScript or `plugin.json`. These rules are
verified against the real Rhino/ScriptExecutor/jsoup runtime.

## Script and config contract

- `load('file.js');` requires a literal filename and is not recursive. A loaded library
  must not load another file. `crypto.js` always resolves to bundled CryptoJS.
- Never declare a variable with the same name as an injected static config key. Static
  settings and bare connection keys are injected as strings. Parse them explicitly.
  Dynamic `config.js` values use `localConfig`; `mode: "database"` uses `localDatabase`.
- `thread_num`, `delay`, and `ignore` are bare number/boolean connection settings.
  `timeout` is not: put it in `fetch(..., { timeout: ms })`.
- Every positional `execute(...)` argument is a string. Scripts without positional
  arguments read context from bridges such as `localBook`, `localConfig`, and
  `localDatabase`.
- `Response.success(items, next)` requires a string next token. Use `""` for the end,
  never `null`, `0`, or a number.
- Uncaught exceptions kill the call. Guard optional selections/bridge returns and use
  `Response.error(...)` for expected failures.
- Normal app execution removes a trailing `/` from URL arguments; `/extension/test`
  does not. Restore it when the source requires it.
- `metadata.regexp` matches the whole URL. Test it against a real detail URL; a bare
  host regex does not route.

## Rhino ES6 limits

Do not use `async`/`await`, arrow functions, template literals, optional chaining,
nullish coalescing, object/array spread, `flat`/`flatMap`, numeric separators, named
regex groups, lookbehind, or Java interop. Use ordinary functions, string concatenation,
loops, `Object.assign`, and plain capture groups.

Coerce bridge values with `String`, `Number`, or `parseInt`; do not rely on `typeof`
across the host boundary. A failing iOS bridge may return `undefined`. WebSocket binary
messages are unavailable on iOS, and actions cannot be interrupted there.

## Fetching and parsing

Always check `response.ok` before `.html()`, `.json()`, `.text()`, or `.base64()`:

```js
let response = fetch(url);
if (!response.ok) return Response.error("HTTP " + response.status);
let doc = response.html();
```

Use jsoup selectors before regex over HTML. Regex is appropriate only for values outside
the DOM: embedded JSON/RSC state, inline scripts, encoded attributes, or player stream
URLs. Select the smallest node first, unescape once in a shared helper, and comment why
regex is necessary.

## URLs and site config

For novel/comic/audio/video, `config.js` must start with a working hardcoded `BASE_URL`,
then optionally override it from injected `DOMAIN` inside `try/catch`. Never initialize
`BASE_URL` directly from possibly-absent `DOMAIN`.

Keep one shared `normalizeUrl` in `config.js`. Every site-URL script (`detail`, `page`,
`toc`, `chap`) loads config and normalizes incoming hosts before fetching.
