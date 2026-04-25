import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { DocMasthead } from '../components/DocMasthead'
import { DocSidebarPanel } from '../components/DocSidebarPanel'
import { useCloseNavOnMedia } from '../components/useCloseNavOnMedia'
import { useLockBodyScroll } from '../components/useLockBodyScroll'
import { useNavKeyboard } from '../components/useNavKeyboard'
import { useDocumentTitle } from '../useDocumentTitle'
import { homeHeroInnerHtml } from '../docHtml'

const HSID = 'home-sidebar'
const TITLE = 'Haus of Grooming OS — documentation'

export function HomePage() {
  useDocumentTitle(TITLE)
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
    <div className="home-page-layout">
      <a className="skip" href="#main">
        Skip to main content
      </a>
      <DocMasthead
        menuId={HSID}
        menuOpen={menuOpen}
        onMenuClick={() => setMenuOpen((o) => !o)}
        title="Grooming OS Docs"
        tag="Chapters"
      />
      {menuOpen && (
        <div
          className="doc-nav-scrim"
          onClick={close}
          role="presentation"
          aria-hidden="true"
        />
      )}
      <DocSidebarPanel
        id={HSID}
        currentChapter={null}
        onNavigate={close}
        variant="home"
        className={menuOpen ? 'sidebar--open' : undefined}
      />
      <div
        className="home-hero"
        id="main"
        dangerouslySetInnerHTML={{ __html: homeHeroInnerHtml }}
      />
    </div>
  )
}
