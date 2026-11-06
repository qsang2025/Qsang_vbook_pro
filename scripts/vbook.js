#!/usr/bin/env node
/**
 * vBook Developer Server CLI — Connect, Test, Build, Install, TestAll.
 * Operates against vBook local REST server on phone/emulator.
 * Zero external dependencies.
 *
 * Usage:
 *   node scripts/vbook.js connect
 *   node scripts/vbook.js install <ext-dir> [--no-icon]
 *   node scripts/vbook.js build   <ext-dir> [out.zip]
 *   node scripts/vbook.js test    <ext-dir> <script.js> [arg1 arg2 ...]
 *   node scripts/vbook.js testall [ext...] [--query <kw>] [--timeout <ms>] [--json <file>]
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const { URL } = require("url");
const { buildExtension } = require("./build");

const SERVERS_FILE = path.join(__dirname, "servers.json");
const SERVERS_EXAMPLE = path.join(__dirname, "servers.example.json");

function die(msg) {
  console.error("ERROR: " + msg);
  process.exit(1);
}

function repoRoot() {
  return path.resolve(__dirname, "..");
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function pad(s, len = 20) {
  return String(s || "").padEnd(len, " ").slice(0, len);
}

function hostOf(s) {
  try {
    return new URL(s).host.replace(/^www\./, "");
  } catch (e) {
    return "";
  }
}

function pickHost(item) {
  if (!item) return "";
  return hostOf(item.link || item.url || "") || hostOf(item.host || "");
}

function resolveExtDir(target) {
  const root = repoRoot();
  let candidate = path.resolve(process.cwd(), target);
  if (fs.existsSync(path.join(candidate, "plugin.json"))) return candidate;

  // Search inside extensions/<type>/<name>
  const extBase = path.join(root, "extensions");
  if (fs.existsSync(extBase)) {
    for (const type of fs.readdirSync(extBase)) {
      const p = path.join(extBase, type, target);
      if (fs.existsSync(path.join(p, "plugin.json"))) return p;
    }
  }

  die(`Could not locate extension directory for '${target}'`);
}

function listAllExtDirs() {
  const root = repoRoot();
  const extBase = path.join(root, "extensions");
  const results = [];

  function scan(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    if (fs.existsSync(path.join(dir, "plugin.json")) && fs.existsSync(path.join(dir, "src")) && dir !== root) {
      results.push(dir);
      return;
    }
    for (const ent of entries) {
      if (ent.isDirectory() && ent.name !== "node_modules" && ent.name !== ".git") {
        scan(path.join(dir, ent.name));
      }
    }
  }

  scan(extBase);
  return results.sort();
}

function request(method, urlStr, bodyObj) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const lib = u.protocol === "https:" ? https : http;
    const body = bodyObj != null ? JSON.stringify(bodyObj) : null;
    const headers = { "Accept": "application/json" };
    if (body != null) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(body);
    }
    const req = lib.request({
      hostname: u.hostname,
      port: u.port || (u.protocol === "https:" ? 443 : 80),
      path: u.pathname + u.search,
      method: method,
      headers: headers,
    }, res => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", c => { data += c; });
      res.on("end", () => { resolve({ status: res.statusCode, text: data }); });
    });
    req.on("error", reject);
    if (body != null) req.write(body);
    req.end();
  });
}

function requestTimeout(method, urlStr, bodyObj, timeoutMs) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const lib = u.protocol === "https:" ? https : http;
    const body = bodyObj != null ? JSON.stringify(bodyObj) : null;
    const headers = { "Accept": "application/json" };
    if (body != null) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(body);
    }
    const req = lib.request({
      hostname: u.hostname,
      port: u.port || (u.protocol === "https:" ? 443 : 80),
      path: u.pathname + u.search,
      method: method,
      headers: headers,
    }, res => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", c => { data += c; });
      res.on("end", () => { resolve({ status: res.statusCode, text: data }); });
    });
    req.on("error", reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error("Timeout after " + timeoutMs + "ms"));
    });
    if (body != null) req.write(body);
    req.end();
  });
}

function parseJson(text) {
  try { return JSON.parse(text); } catch (e) { return null; }
}

async function probeServer(server) {
  try {
    const res = await request("GET", new URL("/connect", server).toString());
    const j = parseJson(res.text);
    const device = j && j.data != null ? String(j.data) : res.text.trim();
    if (res.status !== 200) {
      return { ok: false, error: `/connect returned ${res.status} ${device}` };
    }
    return { ok: true, device: device };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function readServerList() {
  if (!fs.existsSync(SERVERS_FILE)) return null;
  try {
    const cfg = JSON.parse(fs.readFileSync(SERVERS_FILE, "utf8"));
    return Array.isArray(cfg.servers) ? cfg.servers.filter(s => typeof s === "string" && s.trim()) : [];
  } catch (e) {
    die("servers.json is not valid JSON: " + e.message);
  }
}

async function resolveServer(explicit) {
  if (explicit) {
    const r = await probeServer(explicit);
    if (!r.ok) {
      die(`Cannot reach vBook server at ${explicit} (${r.error}).\n` +
          "  -> On the phone, open vBook and turn ON Developer Mode to start the local server.");
    }
    console.log(`[connect] Device: ${r.device || "(unknown)"} @ ${explicit}`);
    return explicit;
  }

  const list = readServerList();
  if (list === null) {
    die("No server configured.\n" +
        `  -> Copy ${path.relative(repoRoot(), SERVERS_EXAMPLE)} to ${path.relative(repoRoot(), SERVERS_FILE)} and configure your phone IP:port.\n` +
        "     Or pass --server http://<ip>:<port> / set VBOOK_SERVER.");
  }
  if (list.length === 0) {
    die("servers.json has no servers listed. Add at least one http://<ip>:<port>.");
  }

  for (const s of list) {
    const r = await probeServer(s);
    if (r.ok) {
      console.log(`[connect] Device: ${r.device || "(unknown)"} @ ${s}`);
      return s;
    }
  }

  die(`None of the server(s) in servers.json responded. Open vBook, enable Dev Mode, and confirm IP.`);
}

function buildPayload(extDir, wantIcon) {
  buildExtension(extDir);

  const pluginPath = path.join(extDir, "plugin.json");
  const srcDir = path.join(extDir, "src");
  const src = {};
  for (const f of fs.readdirSync(srcDir)) {
    if (f.endsWith(".js")) {
      src[f] = fs.readFileSync(path.join(srcDir, f), "utf8");
    }
  }

  const payload = {
    plugin: fs.readFileSync(pluginPath, "utf8"),
    src: JSON.stringify(src)
  };

  if (wantIcon) {
    const iconPath = path.join(extDir, "icon.png");
    if (fs.existsSync(iconPath)) {
      payload.icon = fs.readFileSync(iconPath).toString("base64");
    }
  }

  return payload;
}

async function runScript(server, extDir, script, vararg, timeoutMs) {
  const p = buildPayload(extDir, false);
  p.input = JSON.stringify({ script: script, vararg: vararg });
  let res;
  try {
    res = await requestTimeout("POST", new URL("/extension/test", server).toString(), p, timeoutMs);
  } catch (e) {
    return { unreachable: true, err: e.message };
  }
  const j = parseJson(res.text);
  if (!j) return { err: "bad response: " + res.text.slice(0, 120) };

  let inner = j.data != null ? j.data : j.message;
  let scriptCode = j.code;
  if (inner && typeof inner === "object" && !Array.isArray(inner) && ("code" in inner) && ("data" in inner)) {
    scriptCode = inner.code;
    inner = inner.data;
  }
  const out = inner;
  const r = { code: scriptCode, log: j.log };
  if (typeof out === "string") {
    r.text = out;
    if (/Error|Exception|not defined|Cannot find/.test(out)) r.err = out.split("\n")[0];
  } else if (Array.isArray(out)) {
    r.count = out.length;
    r.empty = out.length === 0;
    const first = out[0] || {};
    r.firstHost = pickHost(first);
    r.firstLink = first.link || first.url || "";
  } else if (out && typeof out === "object") {
    r.count = 1;
    r.firstHost = pickHost(out);
    r.firstLink = out.link || out.url || "";
  }
  return r;
}

function classify(run, srcHost) {
  if (!run) return { status: "NO_SCRIPT", note: "" };
  if (run.unreachable) return { status: "UNREACHABLE", note: run.err };
  if (run.err) return { status: "CRASH", note: run.err };
  if (run.code === 1) return { status: "AUTH/MSG", note: (run.text || "").slice(0, 80) };
  if (run.empty) return { status: "EMPTY", note: "code 0 but 0 items" };
  if (run.count > 0 && run.firstHost) {
    if (srcHost && run.firstHost !== srcHost) {
      return { status: "MOVED", note: srcHost + " -> " + run.firstHost };
    }
    return { status: "WORK", note: run.count + " items @ " + run.firstHost };
  }
  if (run.count > 0) return { status: "WORK", note: run.count + " items" };
  return { status: "UNKNOWN", note: "code=" + run.code };
}

async function main() {
  const argv = process.argv.slice(2);
  const noIcon = argv.includes("--no-icon");
  let args = argv.filter(a => a !== "--no-icon");

  let explicitServer = null;
  const sIdx = args.indexOf("--server");
  if (sIdx !== -1) {
    explicitServer = args[sIdx + 1];
    args.splice(sIdx, 2);
  } else {
    explicitServer = process.env.VBOOK_SERVER || null;
  }

  const cmd = args[0];

  if (!cmd || cmd === "help") {
    console.log(`vBook Developer CLI
Commands:
  connect                                           Test connection to device
  build <ext-dir> [out.zip]                         Build zip with bundled lib/ dependencies
  install <ext-dir> [--no-icon]                     Build and install extension to device
  test <ext-dir> <script> [args]                    Test a script on device
  testall [ext...] [--query <kw>] [--json <file>]   Run comprehensive batch test across extensions`);
    return;
  }

  if (cmd === "connect") {
    await resolveServer(explicitServer);
    return;
  }

  if (cmd === "build") {
    const target = args[1] || die("Usage: vbook.js build <ext-dir>");
    const extDir = resolveExtDir(target);
    const res = buildExtension(extDir);
    console.log(`[OK] Built extension ${res.dir} (Size: ${res.zipSize} bytes)`);
    return;
  }

  if (cmd === "install") {
    const target = args[1] || die("Usage: vbook.js install <ext-dir>");
    const extDir = resolveExtDir(target);
    const server = await resolveServer(explicitServer);
    const payload = buildPayload(extDir, !noIcon);

    console.log(`[install] Uploading extension to ${server}...`);
    const res = await request("POST", new URL("/extension/install", server).toString(), payload);
    const j = parseJson(res.text);
    if (res.status === 200 && j && j.code === 200) {
      console.log("[OK] Extension installed successfully to device!");
    } else {
      die("Install failed: " + (j ? j.message : res.text));
    }
    return;
  }

  if (cmd === "test") {
    const target = args[1] || die("Usage: vbook.js test <ext-dir> <script.js> [args...]");
    const script = args[2] || die("Missing script name (e.g. search.js, detail.js)");
    const vararg = args.slice(3);
    const extDir = resolveExtDir(target);
    const server = await resolveServer(explicitServer);
    const payload = buildPayload(extDir, false);

    payload.input = JSON.stringify({ script: script, vararg: vararg });
    console.log(`[test] Running ${script} with args ${JSON.stringify(vararg)}...`);
    const res = await request("POST", new URL("/extension/test", server).toString(), payload);
    const j = parseJson(res.text);
    if (!j) die("Bad server response: " + res.text);

    if (j.log) console.log(`[log]\n${j.log}`);
    console.log(`[output]`, j.data !== undefined ? j.data : j.message);
    console.log(`[code] ${j.code}`);
    return;
  }

  if (cmd === "testall") {
    let query = "tien";
    let timeoutMs = 45000;
    let jsonOut = null;

    const qi = args.indexOf("--query");
    if (qi !== -1) { query = args[qi + 1]; args.splice(qi, 2); }
    const ti = args.indexOf("--timeout");
    if (ti !== -1) { timeoutMs = parseInt(args[ti + 1], 10); args.splice(ti, 2); }
    const ji = args.indexOf("--json");
    if (ji !== -1) { jsonOut = args[ji + 1]; args.splice(ji, 2); }

    const explicitDirs = args.slice(1).map(d => resolveExtDir(d));
    const dirs = explicitDirs.length > 0 ? explicitDirs : listAllExtDirs();

    const server = await resolveServer(explicitServer);
    console.log(`[testall] Testing ${dirs.length} extension(s), query="${query}", timeout=${timeoutMs}ms`);
    if (jsonOut) console.log(`[testall] Results will stream to ${jsonOut}\n`);

    const results = [];
    function flush() {
      if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(results, null, 2), "utf8");
    }

    let consecutiveUnreach = 0;
    for (let i = 0; i < dirs.length; i++) {
      const extDir = dirs[i];
      const relName = path.relative(repoRoot(), extDir);
      let plugin = {}, meta = {}, scripts = {};
      try {
        plugin = JSON.parse(fs.readFileSync(path.join(extDir, "plugin.json"), "utf8"));
        meta = plugin.metadata || {};
        scripts = plugin.script || {};
      } catch (e) {
        results.push({ ext: relName, status: "BAD_PLUGIN", note: e.message });
        console.log(`[${i + 1}/${dirs.length}] ${pad(relName)} BAD_PLUGIN   ${e.message}`);
        flush();
        continue;
      }

      const srcHost = hostOf(meta.source || "");
      let script = scripts.search ? "search.js" : (scripts.home ? "home.js" : Object.values(scripts)[0]);
      let vararg = scripts.search ? [query, "1"] : [];

      let run = script ? await runScript(server, extDir, script, vararg, timeoutMs) : null;
      let cls = classify(run, srcHost);

      if (cls.status === "UNREACHABLE") {
        consecutiveUnreach++;
        await sleep(consecutiveUnreach > 2 ? 15000 : 5000);
        const rp = await probeServer(server);
        if (rp.ok) {
          run = await runScript(server, extDir, script, vararg, timeoutMs);
          cls = classify(run, srcHost);
        }
      }
      if (cls.status !== "UNREACHABLE") consecutiveUnreach = 0;

      const row = {
        ext: relName,
        type: meta.type || "",
        source: meta.source || "",
        script: script,
        status: cls.status,
        note: cls.note
      };
      results.push(row);
      console.log(`[${i + 1}/${dirs.length}] ${pad(relName, 32)} ${pad(cls.status, 12)} ${cls.note || ""}`);
      flush();
    }

    console.log("\n=== SUMMARY ===");
    const byStatus = {};
    results.forEach(r => {
      byStatus[r.status] = byStatus[r.status] || [];
      byStatus[r.status].push(r.ext);
    });
    Object.keys(byStatus).sort().forEach(s => {
      console.log(`${pad(s, 12)} (${byStatus[s].length}): ${byStatus[s].join(", ")}`);
    });
    flush();
    return;
  }

  die("Unknown command: " + cmd);
}

if (require.main === module) {
  main().catch(err => die(err.message));
}

module.exports = {
  resolveExtDir,
  listAllExtDirs,
  buildPayload
};
