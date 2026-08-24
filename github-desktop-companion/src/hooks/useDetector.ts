import { useEffect, useState } from 'react'
import type { DetectorState } from '../shared/types'

export function useDetector() {
  const [state, setState] = useState<DetectorState>({ status: 'connecting' })

  useEffect(() => {
    if (!window.companion) {
      setState({
        status: 'error',
        message: 'Companion preload API를 불러오지 못했어. 개발자 콘솔을 확인해줘.',
      })
      return
    }

    let mounted = true
    void window.companion.getDetectorState().then(nextState => {
      if (mounted) setState(nextState)
    })
    const unsubscribe = window.companion.onDetectorState(setState)
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  return state
}
