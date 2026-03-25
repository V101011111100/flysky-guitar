/**
 * CI Guard: CSRF / Same-Origin check for cookie-authenticated API routes.
 *
 * Rule: any file under src/pages/api/ that exports a mutation handler
 * (POST, PUT, PATCH, DELETE) whose destructured parameters include `cookies`
 * MUST call `ensureSameOrigin(` somewhere in the file.
 *
 * Usage:
 *   node scripts/check-csrf-guard.cjs
 *
 * Exit code 0 → all clear
 * Exit code 1 → one or more violations found (fails the build / CI step)
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── config ────────────────────────────────────────────────────────────────────

const API_DIR = path.resolve(__dirname, '..', 'src', 'pages', 'api');

/**
 * Methods that mutate state and therefore require CSRF protection when the
 * handler reads from `cookies`.
 */
const MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Regex that matches a handler export whose destructuring includes `cookies`.
 *
 * Matches patterns like:
 *   export const POST: APIRoute = async ({ request, cookies }) => {
 *   export const DELETE: APIRoute = async ({ request, params, cookies }) => {
 *
 * The signature must appear on a single line (which is the convention used
 * throughout this codebase). The check is intentionally conservative: if
 * `cookies` appears anywhere in the first destructure block of the handler it
 * is treated as cookie-authenticated.
 */
const COOKIE_HANDLER_RE = new RegExp(
  `export\\s+const\\s+(?:${MUTATION_METHODS.join('|')})\\s*:\\s*APIRoute\\s*=\\s*async\\s*\\(\\s*\\{[^}]*\\bcookies\\b`,
  'gm'
);

const ENSURE_SAME_ORIGIN_RE = /ensureSameOrigin\s*\(/;

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Recursively collect all `.ts` files under `dir`.
 * @param {string} dir
 * @returns {string[]}
 */
function collectTsFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Return a workspace-relative path for display purposes.
 * @param {string} absPath
 * @returns {string}
 */
function relPath(absPath) {
  return path.relative(path.resolve(__dirname, '..'), absPath).replace(/\\/g, '/');
}

// ── main ──────────────────────────────────────────────────────────────────────

function main() {
  if (!fs.existsSync(API_DIR)) {
    console.error(`[csrf-guard] ERROR: API directory not found: ${API_DIR}`);
    process.exit(1);
  }

  const files      = collectTsFiles(API_DIR);
  const violations = [];

  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');

    // Does this file export at least one cookie-authenticated mutation handler?
    if (!COOKIE_HANDLER_RE.test(src)) continue;

    // Reset lastIndex after global regex test
    COOKIE_HANDLER_RE.lastIndex = 0;

    // The file uses cookies in a mutation handler — must call ensureSameOrigin
    if (!ENSURE_SAME_ORIGIN_RE.test(src)) {
      violations.push(relPath(file));
    }
  }

  if (violations.length === 0) {
    console.log('[csrf-guard] ✓ All cookie-authenticated mutation routes call ensureSameOrigin.');
    process.exit(0);
  }

  console.error('\n[csrf-guard] ✗ CSRF guard violation: missing ensureSameOrigin() in the following files:\n');
  for (const v of violations) {
    console.error(`  • ${v}`);
  }
  console.error(`
Fix: add the following check at the top of each handler above ─────────────
  import { ensureSameOrigin } from '<relative-path>/lib/security';

  export const POST: APIRoute = async ({ request, cookies }) => {
    const originCheck = ensureSameOrigin(request);
    if (originCheck) return originCheck;
    // ... rest of handler
  };
─────────────────────────────────────────────────────────────────────────────
`);
  process.exit(1);
}

main();
