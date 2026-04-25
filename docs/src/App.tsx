import { Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { ChapterPage } from './pages/ChapterPage'
import { UnifiedPage } from './pages/UnifiedPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/chapters/:chapterId" element={<ChapterPage />} />
      <Route path="/unified" element={<UnifiedPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
