import { Link, NavLink } from 'react-router-dom'
import { CHAPTER_LINKS, BRAND_BY_CHAPTER } from './chaptersNavData'

type Props = {
  id: string
  /** null = home index */
  currentChapter: 1 | 2 | 3 | 4 | 5 | 6 | 7 | null
  onNavigate?: () => void
  /** "chapter" = full sub labels, "home" = index subtitle */
  variant: 'chapter' | 'home'
  className?: string
}

export function DocSidebarPanel({
  id,
  currentChapter,
  onNavigate,
  variant,
  className = '',
}: Props) {
  const sub =
    variant === 'home'
      ? 'Chapters: implementation through infrastructure'
      : currentChapter
        ? BRAND_BY_CHAPTER[currentChapter]
        : ''

  const variantClass = variant === 'home' ? 'home-sidebar' : 'doc-chapter-nav'
  const rootClass = ['sidebar', variantClass, className].filter(Boolean).join(' ').trim()

  return (
    <aside
      id={id}
      className={rootClass}
      aria-label="Documentation sections"
    >
      <Link to="/" className="brand" onClick={onNavigate}>
        Grooming OS Docs
      </Link>
      {sub ? <span className="brand-sub">{sub}</span> : null}
      <ol className="chapters">
        {CHAPTER_LINKS.map(({ n, path, short }) => (
          <li key={n}>
            <NavLink
              to={path}
              onClick={onNavigate}
              aria-current={currentChapter === n ? 'page' : undefined}
              end
            >
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
          onClick={onNavigate}
        >
          Source .md
        </a>
        {' · '}
        <Link to="/unified" onClick={onNavigate}>
          Legacy single page
        </Link>
      </div>
    </aside>
  )
}
