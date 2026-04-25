import { unifiedBodyHtml } from '../docHtml'
import { useDocumentTitle } from '../useDocumentTitle'
import { useUnifiedLegacyStyles } from '../useUnifiedLegacyStyles'

const TITLE = 'Haus of Grooming OS — Unified architecture, implementation & pricing (legacy)'

export function UnifiedPage() {
  useDocumentTitle(TITLE)
  useUnifiedLegacyStyles()
  return <div dangerouslySetInnerHTML={{ __html: unifiedBodyHtml }} />
}
