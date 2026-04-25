/**
 * Pulls HTML from barber-house-charm/docs, rewrites in-app links for the SPA,
 * and writes src/content/* plus copies markdown to public/docs-sources/.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const docsDir = path.join(root, 'barber-house-charm', 'docs')
const outContent = path.join(root, 'src', 'content')
const outPublicMd = path.join(root, 'public', 'docs-sources')

if (!fs.existsSync(docsDir)) {
  console.error('Missing:', docsDir)
  process.exit(1)
}

fs.mkdirSync(outContent, { recursive: true })
fs.mkdirSync(outPublicMd, { recursive: true })

function rewriteLinks(s) {
  let t = s
  const rep = [
    [/href="index\.html"/g, 'href="/"'],
    [/href='index\.html'/g, "href='/'"],
    [/href="chapter-01-implementation-plan\.html"/g, 'href="/chapters/1"'],
    [/href="chapter-02-backend-api\.html"/g, 'href="/chapters/2"'],
    [/href="chapter-03-frontend\.html"/g, 'href="/chapters/3"'],
    [/href="chapter-04-data-storage\.html"/g, 'href="/chapters/4"'],
    [/href="chapter-05-system-overview\.html"/g, 'href="/chapters/5"'],
    [/href="chapter-06-navigation-matrix\.html"/g, 'href="/chapters/6"'],
    [/href="chapter-07-costs-infrastructure\.html"/g, 'href="/chapters/7"'],
    [/href="unified-architecture-and-pricing\.html"/g, 'href="/unified"'],
  ]
  for (const [re, to] of rep) t = t.replace(re, to)
  t = t.replace(
    /href="(\.\/)?([^"]+\.md)"/g,
    (_, _dot, file) => `href="/docs-sources/${file}"`
  )
  t = t.replace(
    /href='(\.\/)?([^']+\.md)'/g,
    (_, _dot, file) => `href='/docs-sources/${file}'`
  )
  t = t.replace(
    /href="docs\/index\.html"/g,
    'href="/"'
  )
  t = t.replace(
    /href="\.\/index\.html"/g,
    'href="/"'
  )
  return t
}

function extractMain(html) {
  const m = html.match(/<main[^>]*class="doc-main"[^>]*>([\s\S]*?)<\/main>/i)
  return m ? m[1] : null
}

function extractHomeHero(html) {
  const m = html.match(/<div class="home-hero" id="main">([\s\S]*?)<\/div>\s*<\/body>/i)
  return m ? m[1] : null
}

function extractUnifiedStyle(html) {
  const m = html.match(/<style>([\s\S]*?)<\/style>/i)
  return m ? m[1] : null
}

function extractUnifiedBody(html) {
  const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  if (!m) return null
  return m[1].trim()
}

const chapterFiles = [
  ['chapter-01-implementation-plan.html', 'chapter-01.html'],
  ['chapter-02-backend-api.html', 'chapter-02.html'],
  ['chapter-03-frontend.html', 'chapter-03.html'],
  ['chapter-04-data-storage.html', 'chapter-04.html'],
  ['chapter-05-system-overview.html', 'chapter-05.html'],
  ['chapter-06-navigation-matrix.html', 'chapter-06.html'],
  ['chapter-07-costs-infrastructure.html', 'chapter-07.html'],
]

for (const [src, dest] of chapterFiles) {
  const p = path.join(docsDir, src)
  const raw = fs.readFileSync(p, 'utf8')
  const main = extractMain(raw)
  if (!main) throw new Error('No <main> in ' + src)
  fs.writeFileSync(path.join(outContent, dest), rewriteLinks(main), 'utf8')
  console.log('Wrote', dest)
}

const indexRaw = fs.readFileSync(path.join(docsDir, 'index.html'), 'utf8')
const hero = extractHomeHero(indexRaw)
if (!hero) throw new Error('No home hero in index')
fs.writeFileSync(path.join(outContent, 'home.html'), rewriteLinks(hero), 'utf8')
console.log('Wrote home.html')

const unifiedPath = path.join(docsDir, 'unified-architecture-and-pricing.html')
const unifiedRaw = fs.readFileSync(unifiedPath, 'utf8')
const uStyle = extractUnifiedStyle(unifiedRaw)
if (uStyle) {
  fs.writeFileSync(
    path.join(root, 'src', 'unified-legacy.css'),
    uStyle.trim() + '\n',
    'utf8'
  )
  console.log('Wrote src/unified-legacy.css')
}
const uBody = extractUnifiedBody(unifiedRaw)
if (!uBody) throw new Error('No body in unified')
fs.writeFileSync(path.join(outContent, 'unified-body.html'), rewriteLinks(uBody), 'utf8')
console.log('Wrote unified-body.html')

fs.copyFileSync(
  path.join(docsDir, 'docs-site.css'),
  path.join(root, 'src', 'docs-site.css')
)
console.log('Wrote src/docs-site.css from docs')

const mdNames = fs
  .readdirSync(docsDir)
  .filter((f) => f.endsWith('.md'))
for (const f of mdNames) {
  fs.copyFileSync(path.join(docsDir, f), path.join(outPublicMd, f))
  console.log('Copied', f, '-> public/docs-sources')
}

console.log('Done.')
