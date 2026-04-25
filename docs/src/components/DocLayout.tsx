import { type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'

const CHAPTERS: { n: 1 | 2 | 3 | 4 | 5 | 6 | 7; path: string; short: string }[] = [
  { n: 1, path: '/chapters/1', short: 'Implementation plan' },
  { n: 2, path: '/chapters/2', short: 'Backend & API' },
  { n: 3, path: '/chapters/3', short: 'Frontend' },
  { n: 4, path: '/chapters/4', short: 'Data & storage' },
  { n: 5, path: '/chapters/5', short: 'System overview' },
  { n: 6, path: '/chapters/6', short: 'Navigation matrix' },
  { n: 7, path: '/chapters/7', short: 'Costs & infrastructure' },
]

const BRAND_BY_CHAPTER: Record<1 | 2 | 3 | 4 | 5 | 6 | 7, string> = {
  1: 'Full markdown · styled tables · SVG aids',
  2: 'Laravel · routes · diagrams',
  3: 'Next.js target · nav · security',
  4: 'PostgreSQL · Redis · S3',
  5: 'Product purpose · per-Haus · modes',
  6: 'Mode × role × route',
  7: 'TEST / MVP / SCALE',
}

type Props = {
  children: ReactNode
  current: 1 | 2 | 3 | 4 | 5 | 6 | 7
}

export function DocLayout({ children, current }: Props) {
  return (
    <>
      <a className="skip" href="#main">
        Skip to main
      </a>
      <div className="doc-shell">
        <aside className="sidebar">
          <Link to="/" className="brand">
            Grooming OS Docs
          </Link>
          <span className="brand-sub">{BRAND_BY_CHAPTER[current]}</span>
          <ol className="chapters">
            {CHAPTERS.map(({ n, path, short }) => (
              <li key={n}>
                <NavLink to={path} aria-current={current === n ? 'page' : undefined} end>
                  <span className="ch-num">{n}</span> {short}
                </NavLink>
              </li>
            ))}
          </ol>
          <div className="sidebar-legacy">
            <a
              href="/docs-sources/full-stack-implementation-master-plan.md"
              target="_blank"
              rel="noreferrer"
            >
              Source .md
            </a>
            {' · '}
            <Link to="/unified">Legacy single page</Link>
          </div>
        </aside>
        {children}
      </div>
    </>
  )
}
