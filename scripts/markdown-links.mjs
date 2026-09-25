import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const LINK_RE = /!?\[[^\]]*\]\(([^\n)]+)\)/g;

const toPosix = (p) => p.split('\\').join('/');

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
  const ws = trimmed.search(/\s/);
  return ws === -1 ? trimmed : trimmed.slice(0, ws);
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
      for (const match of line.matchAll(LINK_RE)) {
        const rawLink = parseDestination(match[1]);
        if (!rawLink || rawLink.startsWith('http://') || rawLink.startsWith('https://')) continue;

        const [pathPart, fragment = ''] = rawLink.split('#', 2);

        if (/^[a-z][a-z0-9+.-]*:/i.test(pathPart)) continue;

        const targetFile = pathPart
          ? resolve(filePath, '..', decodeURIComponent(pathPart))
          : filePath;

        if (pathPart && !existsSync(targetFile)) {
          problems.push({ filePath, line: i + 1, link: rawLink, reason: 'target does not exist' });
          continue;
        }

        if (fragment) {
          const fragmentSlug = slugifyHeading(decodeURIComponent(fragment));
          if (extname(targetFile).toLowerCase() === '.md' && !headingsFor(targetFile).has(fragmentSlug)) {
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
