// Pre-tool guard shared by Copilot cloud agent (.github/hooks) and Claude Code
// (.claude/settings.json). Reads the hook payload on stdin and denies:
//   - access to secret files (.env*, private keys) by path or in shell commands
//   - force pushes (a founder-only, irreversible action)
// Everything else is allowed silently. Deny = JSON on stdout (Copilot format),
// reason on stderr, exit code 2 (blocks in both Copilot and Claude Code).

import { pathToFileURL } from 'node:url';

const SAFE_ENV = new Set(['.env.example', '.env.sample', '.env.template']);
const PATH_KEYS = new Set(['path', 'file_path', 'filePath', 'notebook_path', 'paths', 'filepath']);
const COMMAND_KEYS = new Set(['command', 'cmd', 'script']);

export function isSecretPath(p) {
  const base = String(p).split('/').pop();
  if (/^\.env(\..+)?$/.test(base)) return !SAFE_ENV.has(base);
  if (/^\.env[*?[]/.test(base)) return true; // globs such as .env*
  return /\.(pem|key|p12|pfx)$/i.test(base) || /^id_(rsa|dsa|ecdsa|ed25519)(\.pub)?$/.test(base);
}

function tokens(command) {
  return String(command).split(/[\s'"`=<>|;&()]+/).filter(Boolean);
}

export function isForcePush(command) {
  return String(command)
    .split(/&&|\|\||;|\n/)
    .some((part) => {
      const t = part.split(/[\s'"`()|]+/).filter(Boolean);
      let i = t.indexOf('git');
      if (i === -1) return false;
      i += 1;
      // skip git's global options, e.g. `git -C dir -c k=v push`
      while (i < t.length && t[i].startsWith('-')) i += ['-C', '-c', '--git-dir', '--work-tree', '--namespace'].includes(t[i]) ? 2 : 1;
      if (t[i] !== 'push') return false;
      return t.slice(i + 1).some((a) => a === '-f' || a.startsWith('--force') || /^\+/.test(a) || /^-[a-zA-Z]*f/.test(a));
    });
}

function collect(value, key, out) {
  if (value == null) return;
  if (Array.isArray(value)) {
    for (const v of value) collect(v, key, out);
  } else if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) collect(v, k, out);
  } else if (typeof value === 'string') {
    if (PATH_KEYS.has(key)) out.paths.push(value);
    if (COMMAND_KEYS.has(key)) out.commands.push(value);
  }
}

export function decide(payload) {
  let args = payload?.toolArgs ?? payload?.tool_input ?? {};
  if (typeof args === 'string') {
    try { args = JSON.parse(args); } catch { args = { command: args }; }
  }
  const found = { paths: [], commands: [] };
  collect(args, '', found);

  for (const p of found.paths) {
    if (isSecretPath(p)) return `Access to secret file "${p}" is blocked (AGENTS.md: never read or commit secrets).`;
  }
  for (const c of found.commands) {
    // Commit messages are prose, not file access.
    const prose = /(?:\s-[a-zA-Z]*m|--message)(?:=|\s+)(?:"(?:[^"\\]|\\.)*"|'[^']*')/g;
    const secret = tokens(c.replace(prose, ' ')).find(isSecretPath);
    if (secret) return `Command touches secret file "${secret}" and is blocked (AGENTS.md: never read or commit secrets).`;
    if (isForcePush(c)) return 'Force push is blocked: it is a founder-only, irreversible action (AGENTS.md).';
  }
  return null;
}

async function main() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  let payload;
  try { payload = JSON.parse(raw); } catch { return; } // unparseable input: allow
  const reason = decide(payload);
  if (!reason) return;
  process.stdout.write(JSON.stringify({ permissionDecision: 'deny', permissionDecisionReason: reason }) + '\n');
  process.stderr.write(reason + '\n');
  process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
