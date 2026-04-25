import { useLayoutEffect } from 'react'
import unifiedCss from './unified-legacy.css?raw'

export function useUnifiedLegacyStyles() {
  useLayoutEffect(() => {
    const el = document.createElement('style')
    el.setAttribute('data-grooming-unified-legacy', '')
    el.textContent = unifiedCss
    document.head.appendChild(el)
    return () => {
      el.remove()
    }
  }, [])
}
