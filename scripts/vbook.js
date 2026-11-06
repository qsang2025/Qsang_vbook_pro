#!/usr/bin/env node
/**
 * vBook Developer Server CLI — Connect, Test, Build, Install.
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
  // First ensure libraries are synced
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

async function main() {
  const argv = process.argv.slice(2);
  const noIcon = argv.includes("--no-icon");
  const args = argv.filter(a => a !== "--no-icon");

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
  connect                        Test connection to device
  build <ext-dir> [out.zip]      Build zip with bundled lib/ dependencies
  install <ext-dir> [--no-icon]  Build and install extension to device
  test <ext-dir> <script> [args] Test a script on device
  testall [ext...]               Run health check on multiple extensions`);
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
    const extDirs = listAllExtDirs();
    console.log(`Found ${extDirs.length} extension(s) in extensions/`);
    if (extDirs.length === 0) return;
    const server = await resolveServer(explicitServer);
    for (const d of extDirs) {
      const rel = path.relative(repoRoot(), d);
      console.log(`Testing ${rel}...`);
    }
    return;
  }

  die("Unknown command: " + cmd);
}

if (require.main === module) {
  main().catch(err => die(err.message));
}

module.exports = {
  resolveExtDir,
  listAllExtDirs
};
