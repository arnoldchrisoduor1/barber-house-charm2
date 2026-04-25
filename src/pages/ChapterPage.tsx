import { Navigate, useParams } from 'react-router-dom'
import { DocLayout } from '../components/DocLayout'
import { chapterHtml, chapterTitles } from '../docHtml'
import { useDocumentTitle } from '../useDocumentTitle'

type NumChapter = 1 | 2 | 3 | 4 | 5 | 6 | 7

function parseChapterId(n: string | undefined): NumChapter | null {
  const i = n ? parseInt(n, 10) : Number.NaN
  if (Number.isNaN(i) || i < 1 || i > 7) return null
  return i as NumChapter
}

export function ChapterPage() {
  const { chapterId } = useParams()
  const current = parseChapterId(chapterId)
  if (current == null) return <Navigate to="/" replace />
  const html = chapterHtml[String(current)]
  const name = String(current)
  useDocumentTitle(
    `Haus of Grooming OS — ${chapterTitles[name] ?? `Chapter ${name}`} | docs`
  )
  return (
    <DocLayout current={current}>
      <main className="doc-main" id="main" dangerouslySetInnerHTML={{ __html: html }} />
    </DocLayout>
  )
}
