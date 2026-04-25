import { useDocumentTitle } from '../useDocumentTitle'
import { homeHeroInnerHtml } from '../docHtml'

const TITLE = 'Haus of Grooming OS — documentation'

export function HomePage() {
  useDocumentTitle(TITLE)
  return (
    <>
      <a className="skip" href="#main">
        Skip to main content
      </a>
      <div
        className="home-hero"
        id="main"
        dangerouslySetInnerHTML={{ __html: homeHeroInnerHtml }}
      />
    </>
  )
}
