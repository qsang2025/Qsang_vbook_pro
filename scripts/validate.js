#!/usr/bin/env node
/**
 * Extension & Framework Validator for Qsang_vbook_pro.
 * Performs deep static analysis for Rhino ES6 runtime compliance, vBook API contracts,
 * and library inclusion constraints.
 * Zero external dependencies.
 */

const fs = require("fs");
const path = require("path");

const VALID_TYPES = new Set([
  "novel",
  "chinese_novel",
  "comic",
  "video",
  "audio",
  "translate",
  "tts",
  "ai"
]);

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

/**
 * Checks JavaScript code for Rhino ES6 violations.
 * Rhino 1.8.1 does NOT support ES2017+ features (async/await, arrow functions,
 * template literals, spread, optional chaining, nullish coalescing).
 */
function lintRhinoES6(filename, code) {
  const errors = [];
  const lines = code.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const stripped = line.replace(/\/\/.*$/, "").replace(/\/\*[\s\S]*?\*\//g, ""); // strip comments

    // Arrow functions: e.g. () => or x =>
    if (/(?:\([^\)]*\)|[a-zA-Z0-9_$]+)\s*=>/.test(stripped)) {
      errors.push(`Line ${lineNum}: Arrow function '=>' is forbidden in Rhino ES6.`);
    }

    // Async function / await
    if (/\basync\s+function\b|\bawait\s+/.test(stripped)) {
      errors.push(`Line ${lineNum}: 'async' / 'await' is forbidden in Rhino ES6.`);
    }

    // Template literals (backticks)
    if (/`/.test(stripped)) {
      errors.push(`Line ${lineNum}: Template literals (\`...\`) are forbidden in Rhino ES6; use string concat (+).`);
    }

    // Optional chaining ?.
    if (/\?\./.test(stripped)) {
      errors.push(`Line ${lineNum}: Optional chaining (?.) is forbidden in Rhino ES6.`);
    }

    // Nullish coalescing ??
    if (/\?\?/.test(stripped)) {
      errors.push(`Line ${lineNum}: Nullish coalescing (??) is forbidden in Rhino ES6; use '||' or ternary.`);
    }

    // Spread operator ...
    if (/\.\.\.[a-zA-Z0-9_$]+/.test(stripped)) {
      errors.push(`Line ${lineNum}: Spread operator (...) is forbidden in Rhino ES6.`);
    }

    // Array flat / flatMap
    if (/\.(flat|flatMap)\s*\(/.test(stripped)) {
      errors.push(`Line ${lineNum}: Array .flat()/.flatMap() is forbidden in Rhino ES6.`);
    }
  }

  return errors;
}

/**
 * Reads local filenames inside a ZIP file buffer without third-party dependencies.
 */
function listZipEntries(zipBuffer) {
  const entries = [];
  let offset = 0;
  while (offset + 30 <= zipBuffer.length) {
    const sig = zipBuffer.readUInt32LE(offset);
    if (sig !== 0x04034b50) break; // Local file header signature

    const compSize = zipBuffer.readUInt32LE(offset + 18);
    const nameLen = zipBuffer.readUInt16LE(offset + 26);
    const extraLen = zipBuffer.readUInt16LE(offset + 28);
    const name = zipBuffer.toString("utf8", offset + 30, offset + 30 + nameLen);

    entries.push(name);
    offset += 30 + nameLen + extraLen + compSize;
  }
  return entries;
}

/**
 * Validates a single extension directory against all requirements.
 */
function validateExtension(extDir) {
  const issues = [];
  const repoRoot = getRepoRoot();
  const relDir = path.relative(repoRoot, extDir);

  const pluginPath = path.join(extDir, "plugin.json");
  const srcDir = path.join(extDir, "src");
  const zipPath = path.join(extDir, "plugin.zip");
  const testJsonPath = path.join(extDir, "test.json");

  // 1. Check plugin.json
  if (!fs.existsSync(pluginPath)) {
    return [`[FATAL] Missing plugin.json in ${relDir}`];
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(pluginPath, "utf8"));
  } catch (e) {
    return [`[FATAL] Invalid JSON in ${relDir}/plugin.json: ${e.message}`];
  }

  const meta = manifest.metadata || {};
  const requiredMeta = ["name", "author", "version", "source", "type", "locale"];
  for (const field of requiredMeta) {
    if (!meta[field] && meta[field] !== 0) {
      issues.push(`Missing metadata field '${field}' in ${relDir}/plugin.json`);
    }
  }

  if (meta.type && !VALID_TYPES.has(meta.type)) {
    issues.push(`Invalid extension type '${meta.type}'. Must be one of: ${Array.from(VALID_TYPES).join(", ")}`);
  }

  if (meta.encrypt === true) {
    issues.push(`Manifest has 'encrypt: true'. Extensions must not be encrypted by default; committed code must be human readable.`);
  }

  // 2. Check src/ and scripts
  if (!fs.existsSync(srcDir)) {
    issues.push(`Missing src/ directory in ${relDir}`);
    return issues;
  }

  const srcFiles = fs.readdirSync(srcDir).filter(f => f.endsWith(".js"));
  if (srcFiles.length === 0) {
    issues.push(`No JavaScript files found in ${relDir}/src/`);
  }

  function findLoadCalls(code) {
    const found = [];
    let i = 0;
    const n = code.length;
    while (i < n) {
      const c = code.charAt(i);
      if (c === '"' || c === "'" || c === "`") {
        const q = c;
        i++;
        while (i < n && code.charAt(i) !== q) {
          if (code.charAt(i) === "\\") i++;
          i++;
        }
        i++;
        continue;
      }
      if (c === "/" && code.charAt(i + 1) === "/") {
        while (i < n && code.charAt(i) !== "\n") i++;
        continue;
      }
      if (c === "/" && code.charAt(i + 1) === "*") {
        i += 2;
        while (i + 1 < n && !(code.charAt(i) === "*" && code.charAt(i + 1) === "/")) i++;
        i += 2;
        continue;
      }
      if (code.slice(i, i + 4) === "load" && !/[a-zA-Z0-9_$]/.test(code.charAt(i - 1) || "")) {
        const m = /^load\s*\(\s*(['"])([^'"]+)\1/.exec(code.slice(i));
        if (m) {
          found.push(m[2]);
          i += m[0].length;
          continue;
        }
      }
      i++;
    }
    return found;
  }

  const loadedFiles = new Set();

  for (const file of srcFiles) {
    const filePath = path.join(srcDir, file);
    const code = fs.readFileSync(filePath, "utf8");

    // Lint for Rhino ES6 compatibility
    const lintErrors = lintRhinoES6(file, code);
    for (const le of lintErrors) {
      issues.push(`${relDir}/src/${file} -> ${le}`);
    }

    // Check execute function existence for runnable scripts
    if (file !== "config.js" && file !== "cleanHtml.js" && file !== "config-helpers.js" && file !== "fetch-helpers.js" && file !== "gbk.js" && file !== "helper.js") {
      if (!/\bfunction\s+execute\s*\(/.test(code)) {
        issues.push(`${relDir}/src/${file}: Missing mandatory 'function execute(...)'`);
      }
    }

    // Track loaded libraries (skipping comments/strings)
    const calls = findLoadCalls(code);
    for (const targetLib of calls) {
      loadedFiles.add(targetLib);

      // Rule: load() must only load top-level file
      if (targetLib.indexOf("/") !== -1 || targetLib.indexOf("\\") !== -1) {
        issues.push(`${relDir}/src/${file}: load('${targetLib}') contains path separators. vBook load() only supports top-level filenames.`);
      }
    }
  }

  // 3. Check loaded files exist at top level of src/
  for (const lib of loadedFiles) {
    const targetPath = path.join(srcDir, lib);
    if (!fs.existsSync(targetPath)) {
      issues.push(`Script in ${relDir} calls load('${lib}'), but '${lib}' does not exist in ${relDir}/src/. Run 'node scripts/build.js' to bundle required libraries.`);
    } else {
      // Rule 1: A loaded library cannot itself call load(...) (load is not recursive)
      const libCode = fs.readFileSync(targetPath, "utf8");
      const subMatches = findLoadCalls(libCode);
      if (subMatches.length > 0) {
        issues.push(`[Rule 1 Violation] ${relDir}/src/${lib} calls load('${subMatches.join("', '")}'). vBook constraint: A loaded library cannot itself call load().`);
      }
    }
  }

  // 4. If plugin.zip exists, verify it contains all loaded libs
  if (fs.existsSync(zipPath)) {
    try {
      const zipBuf = fs.readFileSync(zipPath);
      const entries = listZipEntries(zipBuf);
      for (const lib of loadedFiles) {
        const expected = "src/" + lib;
        if (!entries.includes(expected)) {
          issues.push(`plugin.zip in ${relDir} is missing bundled library '${expected}'! Run 'node scripts/build.js' to re-package.`);
        }
      }
    } catch (e) {
      issues.push(`Error reading plugin.zip in ${relDir}: ${e.message}`);
    }
  }

  // 5. Check test.json (golden fixture)
  if (fs.existsSync(testJsonPath)) {
    try {
      const fixture = JSON.parse(fs.readFileSync(testJsonPath, "utf8"));
      if (!fixture.cases || !Array.isArray(fixture.cases)) {
        issues.push(`${relDir}/test.json should contain a 'cases' array for golden test fixtures.`);
      }
    } catch (e) {
      issues.push(`Invalid JSON in ${relDir}/test.json: ${e.message}`);
    }
  }

  return issues;
}

/**
 * Validates shared libraries in lib/ for Rhino ES6 compliance.
 */
function validateLibFiles() {
  const repoRoot = getRepoRoot();
  const libDir = path.join(repoRoot, "lib");
  const issues = [];

  if (!fs.existsSync(libDir)) return issues;

  const files = fs.readdirSync(libDir).filter(f => f.endsWith(".js"));
  for (const f of files) {
    const code = fs.readFileSync(path.join(libDir, f), "utf8");
    const errors = lintRhinoES6("lib/" + f, code);
    for (const e of errors) {
      issues.push(`lib/${f} -> ${e}`);
    }

    // Check for load() inside lib file (Rule: loaded files cannot load other files)
    if (/load\s*\(\s*['"][^'"]+['"]\s*\)/.test(code)) {
      issues.push(`lib/${f}: Contains load() call. vBook constraint: A loaded file cannot load other files.`);
    }
  }

  return issues;
}

function main() {
  const args = process.argv.slice(2);
  const target = args[0];
  const repoRoot = getRepoRoot();

  console.log("=== Qsang_vbook_pro Framework & Extension Validator ===");
  let allIssues = [];

  // 1. Validate shared libraries in lib/
  console.log("[1/3] Validating shared libraries in lib/...");
  const libIssues = validateLibFiles();
  if (libIssues.length > 0) {
    allIssues = allIssues.concat(libIssues);
  } else {
    console.log("  -> Shared libraries in lib/ are 100% Rhino ES6 compliant.");
  }

  // 2. Validate root plugin.json registry
  console.log("[2/3] Validating root plugin.json registry...");
  const rootPj = path.join(repoRoot, "plugin.json");
  if (!fs.existsSync(rootPj)) {
    allIssues.push("Missing root plugin.json registry file.");
  } else {
    try {
      const reg = JSON.parse(fs.readFileSync(rootPj, "utf8"));
      if (!reg.metadata || !Array.isArray(reg.data)) {
        allIssues.push("Root plugin.json must have 'metadata' object and 'data' array.");
      } else {
        console.log(`  -> Root registry valid (${reg.data.length} entries).`);
      }
    } catch (e) {
      allIssues.push("Root plugin.json is invalid JSON: " + e.message);
    }
  }

  // 3. Validate extensions
  console.log("[3/3] Scanning extensions/...");
  let extDirs = [];
  if (target) {
    const resolved = path.resolve(process.cwd(), target);
    extDirs = fs.existsSync(path.join(resolved, "plugin.json")) ? [resolved] : findExtensions(resolved);
  } else {
    extDirs = findExtensions();
  }

  if (extDirs.length === 0) {
    console.log("  -> No extensions currently in extensions/ (Framework ready).");
  } else {
    console.log(`  -> Validating ${extDirs.length} extension(s)...`);
    for (const d of extDirs) {
      const extIssues = validateExtension(d);
      if (extIssues.length > 0) {
        allIssues = allIssues.concat(extIssues);
      }
    }
  }

  console.log("-------------------------------------------------------");
  if (allIssues.length === 0) {
    console.log("[PASS] ALL VALIDATION CHECKS PASSED SUCCESSFULLY!");
    process.exit(0);
  } else {
    console.error(`[FAIL] Found ${allIssues.length} validation issue(s):`);
    for (const iss of allIssues) {
      console.error("  - " + iss);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  validateExtension,
  validateLibFiles,
  lintRhinoES6
};
