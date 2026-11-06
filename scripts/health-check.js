#!/usr/bin/env node
/**
 * Automated Health-Check & Golden Fixture Runner for Qsang_vbook_pro.
 * Features:
 *  - Checks source domain connectivity & response latency.
 *  - Evaluates golden fixtures from test.json to catch website layout/markup changes early.
 *  - Automatically generates / updates STATUS.md.
 *  - Emits failure_summary.json for CI to open GitHub Issues when sources break.
 * Zero external dependencies.
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { URL } = require("url");

function getRepoRoot() {
  return path.resolve(__dirname, "..");
}

function findExtensions(startDir) {
  const root = startDir || path.join(getRepoRoot(), "extensions");
  const results = [];

  function walk(current) {
    if (!fs.existsSync(current)) return;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    const hasPlugin = fs.existsSync(path.join(current, "plugin.json"));
    const hasSrc = fs.existsSync(path.join(current, "src")) && fs.statSync(path.join(current, "src")).isDirectory();

    if (hasPlugin && hasSrc && current !== getRepoRoot()) {
      results.push(current);
      return;
    }

    for (const ent of entries) {
      if (ent.isDirectory() && ent.name !== "node_modules" && ent.name !== ".git") {
        walk(path.join(current, ent.name));
      }
    }
  }

  walk(root);
  return results.sort();
}

function probeUrl(targetUrl, timeoutMs = 10000) {
  return new Promise(resolve => {
    const startTime = Date.now();
    try {
      const u = new URL(targetUrl);
      const lib = u.protocol === "https:" ? https : http;
      const req = lib.get(u, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        },
        timeout: timeoutMs
      }, res => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", chunk => {
          if (body.length < 50000) body += chunk; // capture sample
        });
        res.on("end", () => {
          const latency = Date.now() - startTime;
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 400,
            status: res.statusCode,
            latency,
            bodySample: body,
            error: null
          });
        });
      });

      req.on("error", err => {
        resolve({
          ok: false,
          status: 0,
          latency: Date.now() - startTime,
          bodySample: "",
          error: err.message
        });
      });

      req.on("timeout", () => {
        req.destroy();
        resolve({
          ok: false,
          status: 504,
          latency: timeoutMs,
          bodySample: "",
          error: `Timeout after ${timeoutMs}ms`
        });
      });
    } catch (e) {
      resolve({
        ok: false,
        status: 0,
        latency: 0,
        bodySample: "",
        error: e.message
      });
    }
  });
}

async function runHealthCheck() {
  const repoRoot = getRepoRoot();
  const extDirs = findExtensions();
  const results = [];
  const failures = [];

  console.log(`Running health checks on ${extDirs.length} extension(s)...`);

  for (const extDir of extDirs) {
    const pjPath = path.join(extDir, "plugin.json");
    const testJsonPath = path.join(extDir, "test.json");
    const relDir = path.relative(repoRoot, extDir).replace(/\\/g, "/");

    let manifest = {};
    try {
      manifest = JSON.parse(fs.readFileSync(pjPath, "utf8"));
    } catch (e) {
      continue;
    }

    const meta = manifest.metadata || {};
    const sourceUrl = meta.source || "";
    let status = "UNKNOWN";
    let latency = 0;
    let detail = "";

    if (!sourceUrl) {
      status = "NO_SOURCE";
      detail = "Manifest has no source URL";
    } else {
      const probe = await probeUrl(sourceUrl);
      latency = probe.latency;

      if (!probe.ok) {
        status = "BROKEN";
        detail = probe.error || `HTTP ${probe.status}`;
      } else {
        status = "HEALTHY";
        detail = `HTTP ${probe.status} (${probe.latency}ms)`;

        // Check golden fixtures if test.json exists
        if (fs.existsSync(testJsonPath)) {
          try {
            const fixture = JSON.parse(fs.readFileSync(testJsonPath, "utf8"));
            if (fixture.cases && Array.isArray(fixture.cases)) {
              for (const testCase of fixture.cases) {
                if (testCase.url) {
                  const caseProbe = await probeUrl(testCase.url);
                  if (!caseProbe.ok) {
                    status = "DEGRADED";
                    detail = `Fixture URL failed: ${testCase.url} (${caseProbe.status || caseProbe.error})`;
                    break;
                  }
                  if (testCase.expectedPattern && !new RegExp(testCase.expectedPattern, "i").test(caseProbe.bodySample)) {
                    status = "DEGRADED";
                    detail = `Fixture pattern '${testCase.expectedPattern}' missing (Markup changed)`;
                    break;
                  }
                }
              }
            }
          } catch (e) {
            detail += ` (test.json error: ${e.message})`;
          }
        }
      }
    }

    const itemResult = {
      name: meta.name || path.basename(extDir),
      type: meta.type || "unknown",
      dir: relDir,
      source: sourceUrl,
      status: status,
      latency: `${latency}ms`,
      detail: detail,
      lastChecked: new Date().toISOString()
    };

    results.push(itemResult);
    if (status === "BROKEN" || status === "DEGRADED") {
      failures.push(itemResult);
    }

    console.log(`[${status}] ${itemResult.name} -> ${detail}`);
  }

  // Update STATUS.md
  updateStatusMarkdown(results);

  // Write failure summary for GitHub Actions
  const summaryPath = path.join(repoRoot, "health-check-failures.json");
  fs.writeFileSync(summaryPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    total: results.length,
    failedCount: failures.length,
    failures: failures
  }, null, 2), "utf8");

  console.log(`\nHealth check finished: ${results.length - failures.length}/${results.length} healthy.`);
  return { results, failures };
}

function updateStatusMarkdown(results) {
  const repoRoot = getRepoRoot();
  const statusMdPath = path.join(repoRoot, "STATUS.md");

  const now = new Date().toISOString().replace("T", " ").replace(/\..+/, " UTC");
  const healthyCount = results.filter(r => r.status === "HEALTHY").length;
  const degradedCount = results.filter(r => r.status === "DEGRADED").length;
  const brokenCount = results.filter(r => r.status === "BROKEN").length;

  let md = `# Extension Status & Health Report\n\n`;
  md += `> Automatically generated by scheduled CI health-check.\n`;
  md += `> **Last updated:** \`${now}\`\n\n`;

  md += `### Summary\n\n`;
  md += `| Total Extensions | Healthy | Degraded | Broken |\n`;
  md += `| :---: | :---: | :---: | :---: |\n`;
  md += `| **${results.length}** | 🟢 ${healthyCount} | 🟡 ${degradedCount} | 🔴 ${brokenCount} |\n\n`;

  md += `### Source Details\n\n`;
  md += `| Extension | Type | Source | Status | Latency | Details | Last Checked |\n`;
  md += `| :--- | :--- | :--- | :---: | :---: | :--- | :--- |\n`;

  if (results.length === 0) {
    md += `| *(No extensions registered yet)* | - | - | ⚪ READY | - | Framework initialized, ready for extensions | \`${now}\` |\n`;
  } else {
    for (const r of results) {
      let icon = "⚪";
      if (r.status === "HEALTHY") icon = "🟢 HEALTHY";
      else if (r.status === "DEGRADED") icon = "🟡 DEGRADED";
      else if (r.status === "BROKEN") icon = "🔴 BROKEN";

      const sourceLink = r.source ? `[${r.source.replace(/^https?:\/\//, "")}](${r.source})` : "-";
      md += `| **${r.name}** | \`${r.type}\` | ${sourceLink} | ${icon} | ${r.latency} | ${r.detail} | \`${r.lastChecked.split("T")[0]}\` |\n`;
    }
  }

  md += `\n---\n*Report generated by \`scripts/health-check.js\` — Qsang_vbook_pro*\n`;

  fs.writeFileSync(statusMdPath, md, "utf8");
  console.log(`[OK] Updated ${statusMdPath}`);
}

if (require.main === module) {
  runHealthCheck();
}

module.exports = {
  runHealthCheck,
  probeUrl,
  updateStatusMarkdown
};
