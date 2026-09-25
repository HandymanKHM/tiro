import { existsSync, lstatSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const SETEXT_RE = /^\s{0,3}(=+|-+)\s*$/;
const FENCE_RE = /^\s{0,3}(`{3,}|~{3,})/;
const REF_DEF_RE = /^\s{0,3}\[([^\]]+)\]:\s*(<[^>]*>|\S+)/;
const REF_USE_RE = /!?\[([^\]]+)\]\[([^\]]*)\]/g;

const toPosix = (p) => p.split('\\').join('/');
const safeDecode = (value) => {
  try {
    return { ok: true, value: decodeURIComponent(value) };
  } catch {
    return { ok: false, value };
  }
};

function slugifyHeading(text) {
  return text
    .trim()
    .replace(/\s+#+\s*$/, '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

function normalizeReferenceLabel(label) {
  return label.trim().replace(/\s+/g, ' ').toLowerCase();
}

function consumeFence(line, currentFence) {
  const trimmed = line.trimStart();
  if (currentFence) {
    const closer = new RegExp(`^${currentFence.marker}{${currentFence.length},}\\s*$`);
    return closer.test(trimmed) ? { fence: null, skipLine: true } : { fence: currentFence, skipLine: true };
  }
  const opener = FENCE_RE.exec(trimmed);
  if (!opener) return { fence: currentFence, skipLine: false };
  return { fence: { marker: opener[1][0], length: opener[1].length }, skipLine: true };
}

function stripInlineCode(line) {
  let out = '';
  for (let i = 0; i < line.length;) {
    if (line[i] !== '`') {
      out += line[i];
      i += 1;
      continue;
    }
    let run = 1;
    while (line[i + run] === '`') run += 1;
    const marker = '`'.repeat(run);
    const close = line.indexOf(marker, i + run);
    if (close === -1) {
      out += line.slice(i);
      break;
    }
    i = close + run;
  }
  return out;
}

function extractHeadings(markdown) {
  const headings = new Set();
  const seen = new Map();
  const lines = markdown.split('\n');
  let fence = null;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const fenceState = consumeFence(line, fence);
    fence = fenceState.fence;
    if (fenceState.skipLine) continue;
    const match = HEADING_RE.exec(line);
    const setext = i + 1 < lines.length && line.trim() && SETEXT_RE.test(lines[i + 1]);
    const headingText = match ? match[2] : setext ? line : null;
    if (!headingText) continue;
    const slug = slugifyHeading(headingText);
    if (!slug) continue;
    const count = seen.get(slug) ?? 0;
    seen.set(slug, count + 1);
    headings.add(count === 0 ? slug : `${slug}-${count}`);
  }
  return headings;
}

function parseDestination(raw) {
  const trimmed = raw.trim();
  if (trimmed.startsWith('<')) {
    const end = trimmed.indexOf('>');
    return end === -1 ? trimmed : trimmed.slice(1, end);
  }
  return trimmed.replace(/\s+(?:"[^"]*"|'[^']*'|\([^)]*\))\s*$/, '');
}

function extractDestinations(line) {
  const out = [];
  let searchFrom = 0;
  while (searchFrom < line.length) {
    const open = line.indexOf('](', searchFrom);
    if (open === -1) break;
    let i = open + 2;
    let depth = 1;
    if (open > 0 && line[open - 1] === '!') {
      searchFrom = open + 2;
      continue;
    }
    while (i < line.length) {
      const ch = line[i];
      if (ch === '\\') {
        i += 2;
        continue;
      }
      if (ch === '(') depth += 1;
      if (ch === ')') {
        depth -= 1;
        if (depth === 0) break;
      }
      i += 1;
    }
    if (depth === 0) {
      out.push(line.slice(open + 2, i));
      searchFrom = i + 1;
    } else {
      searchFrom = open + 2;
    }
  }
  return out;
}

function extractReferenceDefinitions(markdown) {
  const refs = new Map();
  const lines = markdown.split('\n');
  let fence = null;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const fenceState = consumeFence(line, fence);
    fence = fenceState.fence;
    if (fenceState.skipLine) continue;
    const noCode = stripInlineCode(line);
    const match = REF_DEF_RE.exec(noCode);
    if (!match) continue;
    refs.set(normalizeReferenceLabel(match[1]), { line: i + 1, destination: parseDestination(match[2]) });
  }
  return refs;
}

function isWithinRoot(root, path) {
  const rel = relative(root, path);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function resolveMarkdownTargetForFragment(targetFile) {
  if (extname(targetFile).toLowerCase() === '.md') return targetFile;
  if (existsSync(targetFile) && statSync(targetFile).isDirectory()) {
    for (const name of ['README.md', 'readme.md', 'index.md']) {
      const candidate = join(targetFile, name);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function getMarkdownFiles(targetPath) {
  const out = [];
  const walk = (current) => {
    const st = lstatSync(current);
    if (st.isSymbolicLink()) return;
    if (st.isDirectory()) {
      for (const entry of readdirSync(current, { withFileTypes: true })) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        walk(join(current, entry.name));
      }
      return;
    }
    if (st.isFile() && extname(current).toLowerCase() === '.md') out.push(current);
  };
  walk(targetPath);
  return out;
}

export function checkMarkdownLinks(targetPath) {
  const root = resolve(targetPath);
  const markdownFiles = getMarkdownFiles(root);
  const fileCache = new Map();
  const headingCache = new Map();
  const problems = [];

  const readFile = (filePath) => {
    if (!fileCache.has(filePath)) fileCache.set(filePath, readFileSync(filePath, 'utf8'));
    return fileCache.get(filePath);
  };

  const headingsFor = (filePath) => {
    if (!headingCache.has(filePath)) headingCache.set(filePath, extractHeadings(readFile(filePath)));
    return headingCache.get(filePath);
  };

  const addProblem = (filePath, line, link, reason) => problems.push({ filePath, line, link, reason });

  const checkLink = (filePath, line, rawLink) => {
    if (!rawLink || rawLink.startsWith('http://') || rawLink.startsWith('https://') || rawLink.startsWith('//')) return;
    const [pathPart, fragment = ''] = rawLink.split('#', 2);
    if (/^[a-z][a-z0-9+.-]*:/i.test(pathPart)) return;

    const decodedPath = safeDecode(pathPart);
    if (!decodedPath.ok) {
      addProblem(filePath, line, rawLink, 'invalid URL encoding');
      return;
    }

    const pathCandidate = !pathPart
      ? filePath
      : decodedPath.value.startsWith('/')
        ? resolve(root, `.${decodedPath.value}`)
        : resolve(filePath, '..', decodedPath.value);

    if (!isWithinRoot(root, pathCandidate)) {
      addProblem(filePath, line, rawLink, 'target is outside repository root');
      return;
    }

    const targetFile = pathCandidate;
    if (pathPart && !existsSync(targetFile)) {
      addProblem(filePath, line, rawLink, 'target does not exist');
      return;
    }

    if (!fragment) return;
    const decodedFragment = safeDecode(fragment);
    if (!decodedFragment.ok) {
      addProblem(filePath, line, rawLink, 'invalid URL encoding');
      return;
    }
    const markdownTarget = resolveMarkdownTargetForFragment(targetFile);
    if (!markdownTarget) {
      addProblem(filePath, line, rawLink, 'heading target is not markdown');
      return;
    }
    if (!headingsFor(markdownTarget).has(decodedFragment.value)) {
      addProblem(filePath, line, rawLink, 'heading not found');
    }
  };

  for (const filePath of markdownFiles) {
    const markdown = readFile(filePath);
    const lines = markdown.split('\n');
    const referenceDefinitions = extractReferenceDefinitions(markdown);
    for (const ref of referenceDefinitions.values()) checkLink(filePath, ref.line, ref.destination);

    let fence = null;
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const fenceState = consumeFence(line, fence);
      fence = fenceState.fence;
      if (fenceState.skipLine) continue;
      const noCode = stripInlineCode(line);

      for (const raw of extractDestinations(noCode)) {
        const rawLink = parseDestination(raw);
        checkLink(filePath, i + 1, rawLink);
      }

      for (const match of noCode.matchAll(REF_USE_RE)) {
        if (match[0].startsWith('!')) continue;
        const label = normalizeReferenceLabel(match[2] || match[1]);
        const ref = referenceDefinitions.get(label);
        if (ref) {
          checkLink(filePath, i + 1, ref.destination);
        }
      }
    }
  }

  return problems.map((p) => ({ ...p, filePath: toPosix(relative(root, p.filePath) || p.filePath) }));
}

function main() {
  const input = process.argv[2] ?? process.cwd();
  const targetPath = isAbsolute(input) ? input : resolve(process.cwd(), input);
  const problems = checkMarkdownLinks(targetPath);
  for (const p of problems) {
    console.error(`${p.filePath}:${p.line}: broken link ${JSON.stringify(p.link)} (${p.reason})`);
  }
  if (problems.length > 0) {
    process.exitCode = 1;
    return;
  }
  console.log('markdown links: ok');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
