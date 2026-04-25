import { useEffect } from 'react'

const QUERY = '(min-width: 901px)'

/** Close off-canvas nav when crossing desktop breakpoint. */
export function useCloseNavOnMedia(setOpen: (v: boolean) => void) {
  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const onChange = () => {
      if (mq.matches) setOpen(false)
    }
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [setOpen])
}
