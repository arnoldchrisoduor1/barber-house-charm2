import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { DocMasthead } from './DocMasthead'
import { DocSidebarPanel } from './DocSidebarPanel'
import { useCloseNavOnMedia } from './useCloseNavOnMedia'
import { useLockBodyScroll } from './useLockBodyScroll'
import { useNavKeyboard } from './useNavKeyboard'

const SID = 'doc-sidebar'

type Props = {
  children: ReactNode
  current: 1 | 2 | 3 | 4 | 5 | 6 | 7
}

export function DocLayout({ children, current }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const close = useCallback(() => setMenuOpen(false), [])
  const location = useLocation()

  useEffect(() => {
    close()
  }, [location.pathname, close])

  useLockBodyScroll(menuOpen)
  useCloseNavOnMedia(setMenuOpen)
  useNavKeyboard(menuOpen, close)

  return (
    <>
      <a className="skip" href="#main">
        Skip to main
      </a>
      <DocMasthead
        menuId={SID}
        menuOpen={menuOpen}
        onMenuClick={() => setMenuOpen((o) => !o)}
        title="Grooming OS Docs"
        tag={`Ch. ${current}`}
      />
      {menuOpen && (
        <div
          className="doc-nav-scrim"
          onClick={close}
          role="presentation"
          aria-hidden="true"
        />
      )}
      <div className="doc-shell">
        <DocSidebarPanel
          id={SID}
          currentChapter={current}
          onNavigate={close}
          variant="chapter"
          className={menuOpen ? 'sidebar--open' : undefined}
        />
        {children}
      </div>
    </>
  )
}
