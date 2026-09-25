import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const HEADING_RE = /^(#{1,6})\s+(.*)$/;

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
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function extractHeadings(markdown) {
  const headings = new Set();
  for (const line of markdown.split('\n')) {
    const match = HEADING_RE.exec(line);
    if (!match) continue;
    const slug = slugifyHeading(match[2]);
    if (slug) headings.add(slug);
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
    const st = statSync(current);
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

  for (const filePath of markdownFiles) {
    const lines = readFile(filePath).split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      for (const raw of extractDestinations(line)) {
        const rawLink = parseDestination(raw);
        if (!rawLink || rawLink.startsWith('http://') || rawLink.startsWith('https://') || rawLink.startsWith('//')) continue;

        const [pathPart, fragment = ''] = rawLink.split('#', 2);

        if (/^[a-z][a-z0-9+.-]*:/i.test(pathPart)) continue;

        const decodedPath = safeDecode(pathPart);
        if (!decodedPath.ok) {
          problems.push({ filePath, line: i + 1, link: rawLink, reason: 'invalid URL encoding' });
          continue;
        }

        const decodedPathValue = decodedPath.value;
        const pathCandidate = !pathPart
          ? filePath
          : decodedPathValue.startsWith('/')
            ? resolve(root, `.${decodedPathValue}`)
            : resolve(filePath, '..', decodedPathValue);
        const targetFile = !pathPart || existsSync(pathCandidate) ? pathCandidate : `${pathCandidate}.md`;

        if (pathPart && !existsSync(targetFile)) {
          problems.push({ filePath, line: i + 1, link: rawLink, reason: 'target does not exist' });
          continue;
        }

        if (fragment) {
          const decodedFragment = safeDecode(fragment);
          if (!decodedFragment.ok) {
            problems.push({ filePath, line: i + 1, link: rawLink, reason: 'invalid URL encoding' });
            continue;
          }
          const fragmentSlug = slugifyHeading(decodedFragment.value);
          const markdownTarget = resolveMarkdownTargetForFragment(targetFile);
          if (!markdownTarget) {
            problems.push({ filePath, line: i + 1, link: rawLink, reason: 'heading target is not markdown' });
            continue;
          }
          if (!headingsFor(markdownTarget).has(fragmentSlug)) {
            problems.push({ filePath, line: i + 1, link: rawLink, reason: 'heading not found' });
          }
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
