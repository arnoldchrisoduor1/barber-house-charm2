import { Link } from 'react-router-dom'

type Props = {
  menuOpen: boolean
  onMenuClick: () => void
  title: string
  /** Optional, e.g. "Ch. 3" on chapter pages */
  tag?: string
  menuId: string
}

function MenuIcon3Lines() {
  return (
    <svg
      className="doc-masthead__icon"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

export function DocMasthead({ menuOpen, onMenuClick, title, tag, menuId }: Props) {
  return (
    <header className="doc-masthead">
      <button
        type="button"
        className="doc-masthead__menu"
        onClick={onMenuClick}
        aria-expanded={menuOpen}
        aria-controls={menuId}
        id={`${menuId}-toggle`}
      >
        <span className="visually-hidden">{menuOpen ? 'Close menu' : 'Open menu'}</span>
        {menuOpen ? (
          <svg
            className="doc-masthead__icon"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <MenuIcon3Lines />
        )}
      </button>
      <div className="doc-masthead__titles">
        <Link
          to="/"
          className="doc-masthead__title"
          onClick={menuOpen ? onMenuClick : undefined}
        >
          {title}
        </Link>
        {tag ? <span className="doc-masthead__tag">{tag}</span> : null}
      </div>
    </header>
  )
}
