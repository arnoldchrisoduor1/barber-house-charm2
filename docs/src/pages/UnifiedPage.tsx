import { Link } from 'react-router-dom'
import { unifiedBodyHtml } from '../docHtml'
import { useDocumentTitle } from '../useDocumentTitle'
import { useUnifiedLegacyStyles } from '../useUnifiedLegacyStyles'

const TITLE = 'Haus of Grooming OS — Unified architecture, implementation & pricing (legacy)'

export function UnifiedPage() {
  useDocumentTitle(TITLE)
  useUnifiedLegacyStyles()
  return (
    <div className="unified-app-root">
      <nav className="unified-app-top" aria-label="Documentation navigation">
        <Link to="/" className="unified-app-top__link">
          ← Chapters
        </Link>
      </nav>
      <div dangerouslySetInnerHTML={{ __html: unifiedBodyHtml }} />
    </div>
  )
}
